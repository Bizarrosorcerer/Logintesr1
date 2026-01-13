import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// --- CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyDAUrjhba6zQS47RpS4jH0QyvAw3U7dlcw",
    authDomain: "logintester1-e9b27.firebaseapp.com",
    projectId: "logintester1-e9b27",
    storageBucket: "logintester1-e9b27.firebasestorage.app",
    messagingSenderId: "939798745204",
    appId: "1:939798745204:web:cc88423e2ed867734f0121"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- STATE ---
let currentUser = null;
let currentSessionId = null;
let sessionExceptions = {}; 
let sessionData = null; 
let viewDate = new Date(); 

const fixedHolidays = [
    "-01-01", "-01-26", "-08-15", "-10-02", "-12-25",
    "2026-03-04", "2026-04-03", "2026-03-20", "2026-10-20", "2026-11-08",
    "2027-03-22", "2027-03-26", "2027-03-09", "2027-10-09", "2027-10-29"
];

const screens = {
    login: document.getElementById("login-screen"),
    dashboard: document.getElementById("dashboard-screen"),
    detail: document.getElementById("session-detail-screen")
};

// --- AUTH & SETUP ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists() && userDoc.data().name) {
            loadProfile(userDoc.data());
            showScreen('dashboard');
            loadSessions();
            checkAdmin();
        } else {
            document.getElementById("first-time-setup").classList.remove("hidden");
        }
    } else {
        currentUser = null;
        showScreen('login');
        document.getElementById("first-time-setup").classList.add("hidden");
    }
});

function loadProfile(data) {
    document.getElementById("user-name").innerHTML = ${data.name} <span id="edit-name-btn">✎</span>;
    document.getElementById("user-email").innerText = data.email;
    
    // Handle Photo Logic
    const img = document.getElementById("profile-img");
    const removeBtn = document.getElementById("remove-photo-btn");
    
    if(data.photo) {
        img.src = data.photo;
        removeBtn.classList.remove("hidden");
    } else {
        img.src = "https://via.placeholder.com/50";
        removeBtn.classList.add("hidden");
    }
    
    document.getElementById("edit-name-btn").onclick = () => document.getElementById("edit-name-modal").classList.remove("hidden");
}

document.getElementById("login-btn").addEventListener("click", () => {
    const isSetupMode = !document.getElementById("first-time-setup").classList.contains("hidden");
    const nameInput = document.getElementById("display-name-input").value;

    if(isSetupMode && !nameInput) return alert("Please enter your name!");

    signInWithPopup(auth, provider).then(async (result) => {
        if(isSetupMode && nameInput) {
            await setDoc(doc(db, "users", result.user.uid), {
                name: nameInput,
                email: result.user.email,
                photo: null
            }, { merge: true });
            window.location.reload(); 
        }
    });
});
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));


// --- PROFILE ACTIONS ---
document.getElementById("save-name-btn").onclick = async () => {
    const newName = document.getElementById("edit-name-input").value;
    if(!newName) return;
    await updateDoc(doc(db, "users", currentUser.uid), { name: newName });
    document.getElementById("user-name").innerHTML = ${newName} <span id="edit-name-btn">✎</span>;
    document.getElementById("edit-name-modal").classList.add("hidden");
};
document.getElementById("cancel-edit-name").onclick = () => document.getElementById("edit-name-modal").classList.add("hidden");

// UPLOAD PHOTO (Increased Limit to 5MB)
document.getElementById("profile-pic-wrapper").onclick = () => document.getElementById("profile-upload").click();
document.getElementById("profile-upload").onchange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    // 5MB Limit
    if (file.size > 5 * 1024 * 1024) return alert("Image too large (Max 5MB)");

    const reader = new FileReader();
    reader.onload = async function(evt) {
        const base64 = evt.target.result;
        document.getElementById("profile-img").src = base64;
        document.getElementById("remove-photo-btn").classList.remove("hidden");
        await updateDoc(doc(db, "users", currentUser.uid), { photo: base64 });
    };
    reader.readAsDataURL(file);
};

// REMOVE PHOTO
document.getElementById("remove-photo-btn").onclick = async (e) => {
    e.stopPropagation(); // Stop clicking the wrapper
    if(!confirm("Remove profile photo?")) return;
    
    await updateDoc(doc(db, "users", currentUser.uid), { photo: null });
    document.getElementById("profile-img").src = "https://via.placeholder.com/50";
    document.getElementById("remove-photo-btn").classList.add("hidden");
};


// --- DASHBOARD ---
async function loadSessions() {
    const container = document.getElementById("sessions-container");
    container.innerHTML = "<p>Loading...</p>";
    
    const q = query(collection(db, users/${currentUser.uid}/sessions), orderBy("startDate", "desc"));
    const snapshot = await getDocs(q);
    
    container.innerHTML = "";
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const div = document.createElement("div");
        div.className = "session-card";
        div.innerHTML = `
            <h3>${data.name}</h3>
            <p>Started: ${data.startDate}</p>
            <span class="badge ${data.status.toLowerCase()}">${data.status}</span>
        `;
        div.onclick = () => openSession(docSnap.id, data);
        container.appendChild(div);
    });
}

document.getElementById("add-session-fab").onclick = () => document.getElementById("create-modal").classList.remove("hidden");
document.getElementById("cancel-create").onclick = () => document.getElementById("create-modal").classList.add("hidden");

document.getElementById("confirm-create").onclick = async () => {
    const name = document.getElementById("new-session-name").value;
    const date = document.getElementById("new-session-date").value;
    
    if(!name || !date) return alert("Fill all fields");
    if(new Date(date) > new Date()) return alert("Cannot start in future");
    if(new Date(date) < new Date("2026-01-01")) return alert("Cannot start before 2026");

    await addDoc(collection(db, users/${currentUser.uid}/sessions), {
        name: name,
        startDate: date,
        endDate: null,
        status: "Ongoing"
    });
    
    document.getElementById("create-modal").classList.add("hidden");
    loadSessions();
};


// --- SESSION DETAIL & REAL-TIME UPDATE ---
async function openSession(sessId, data) {
    currentSessionId = sessId;
    sessionData = data;
    sessionExceptions = {};

    document.getElementById("detail-title").innerText = data.name;
    document.getElementById("detail-dates").innerText = ${data.startDate} — ${data.status === 'Ended' ? data.endDate : 'Ongoing'};
    
    if(data.status === "Ended") {
        document.getElementById("end-session-btn").classList.add("hidden");
    } else {
        document.getElementById("end-session-btn").classList.remove("hidden");
    }

    const snap = await getDocs(collection(db, users/${currentUser.uid}/sessions/${sessId}/exceptions));
    snap.forEach(d => { sessionExceptions[d.id] = d.data().status; });

    viewDate = new Date(); 
    renderCalendar();
    calculateAttendance(); // REAL-TIME UPDATE ON OPEN
    
    showScreen('detail');
}

document.getElementById("back-btn").onclick = () => showScreen('dashboard');


function renderCalendar() {
    const grid = document.getElementById("calendar-days");
    grid.innerHTML = "";
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("calendar-month-year").innerText = ${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()};

    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

    for(let i=0; i<firstDay; i++) {
        const div = document.createElement("div");
        grid.appendChild(div);
    }

    for(let i=1; i<=daysInMonth; i++) {
        const div = document.createElement("div");
        div.className = "day-box";
        div.innerText = i;
        
        const dateStr = ${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')};
        const currentObj = new Date(dateStr);
        const startObj = new Date(sessionData.startDate);
        const endObj = sessionData.endDate ? new Date(sessionData.endDate) : new Date();
        const today = new Date();

        if(currentObj < startObj || (sessionData.status === 'Ongoing' && currentObj > today) || (sessionData.status === 'Ended' && currentObj > endObj)) {
            div.classList.add("day-future");
        } else {
            let status = "Present";
            if(isDefaultHoliday(dateStr)) status = "Holiday";
            if(sessionExceptions[dateStr]) status = sessionExceptions[dateStr];

            div.classList.add(day-${status.toLowerCase()});
            div.onclick = () => toggleDay(dateStr, status);
        }

        if(dateStr === sessionData.startDate) div.classList.add("start-date-marker");
        if(sessionData.status === 'Ended' && dateStr === sessionData.endDate) div.classList.add("end-date-marker");
        
        grid.appendChild(div);
    }
}

function isDefaultHoliday(dateStr) {
    const d = new Date(dateStr);
    if(d.getDay() === 0) return true; 
    for(let h of fixedHolidays) {
        if(dateStr.endsWith(h) || dateStr === h) return true;
    }
    return false;
}

async function toggleDay(dateStr, currentStatus) {
    if(sessionData.status === "Ended") return alert("Session Ended. Cannot edit.");
    
    let newStatus = "Present";
    if(currentStatus === "Present") newStatus = "Absent";
    else if(currentStatus === "Absent") newStatus = "Holiday";
    else if(currentStatus === "Holiday") newStatus = "Present"; 

    sessionExceptions[dateStr] = newStatus;
    renderCalendar(); 
    calculateAttendance(); // REAL-TIME UPDATE AFTER CLICK

    const ref = doc(db, users/${currentUser.uid}/sessions/${currentSessionId}/exceptions, dateStr);
    if(newStatus === "Present") {
        if(isDefaultHoliday(dateStr)) await setDoc(ref, { status: "Present" });
        else await deleteDoc(ref);
    } else {
        await setDoc(ref, { status: newStatus });
    }
}

// REAL-TIME CALCULATION FUNCTION
function calculateAttendance() {
    let totalWorkingDays = 0;
    let daysPresent = 0;
    let loopDate = new Date(sessionData.startDate);
    const stopDate = sessionData.endDate ? new Date(sessionData.endDate) : new Date();

    while(loopDate <= stopDate) {
        const dStr = loopDate.toISOString().split('T')[0];
        let status = "Present";
        if(isDefaultHoliday(dStr)) status = "Holiday";
        if(sessionExceptions[dStr]) status = sessionExceptions[dStr];

        if(status !== "Holiday") {
            totalWorkingDays++;
            if(status === "Present") daysPresent++;
        }
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    let percent = 100;
    if(totalWorkingDays > 0) {
        percent = (daysPresent / totalWorkingDays) * 100;
    }
    document.getElementById("attendance-percent").innerText = ${percent.toFixed(2)}%;
}

document.getElementById("prev-month-btn").onclick = () => {
    if(viewDate.getFullYear() === 2026 && viewDate.getMonth() === 0) return;
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
};
document.getElementById("next-month-btn").onclick = () => {
    if(viewDate.getFullYear() === 2027 && viewDate.getMonth() === 11) return;
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
};

document.getElementById("end-session-btn").onclick = () => document.getElementById("end-modal").classList.remove("hidden");
document.getElementById("cancel-end").onclick = () => document.getElementById("end-modal").classList.add("hidden");
document.getElementById("confirm-end").onclick = async () => {
    const date = document.getElementById("end-session-date").value;
    if(!date) return;
    if(new Date(date) < new Date(sessionData.startDate)) return alert("Invalid date");
    await updateDoc(doc(db, users/${currentUser.uid}/sessions, currentSessionId), { endDate: date, status: "Ended" });
    document.getElementById("end-modal").classList.add("hidden");
    loadSessions();
    showScreen('dashboard');
};

function showScreen(id) {
    Object.values(screens).forEach(s => s.classList.add("hidden"));
    screens[id].classList.remove("hidden");
}

async function checkAdmin() {
    const docSnap = await getDoc(doc(db, "users", currentUser.uid));
    if(docSnap.exists() && docSnap.data().isAdmin) {
        document.getElementById("admin-link").classList.remove("hidden");
        document.getElementById("admin-link").onclick = async () => {
            document.getElementById("admin-modal").classList.remove("hidden");
            const list = document.getElementById("admin-list");
            list.innerHTML = "Loading...";
            const allUsers = await getDocs(collection(db, "users"));
            list.innerHTML = "";
            allUsers.forEach(u => {
                const d = u.data();
                // SHOW PHOTO IN ADMIN LIST
                const pic = d.photo ? d.photo : "https://via.placeholder.com/30";
                list.innerHTML += `
                    <div style="border-bottom:1px solid #eee; padding:8px; display:flex; align-items:center; gap:10px;">
                        <img src="${pic}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                        <div>
                            <b>${d.name}</b><br><small>${d.email}</small>
                        </div>
                    </div>`;
            });
        };
        document.getElementById("close-admin").onclick = () => document.getElementById("admin-modal").classList.add("hidden");
    }
}
