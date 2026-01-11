import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

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

// UI Elements
const loginScreen = document.getElementById("login-screen");
const profileScreen = document.getElementById("profile-screen");
const adminSection = document.getElementById("admin-section");
const adminResults = document.getElementById("admin-results");

// --- 1. GLOBAL FUNCTION TO SAVE OTHER USERS ---
// We attach this to 'window' so the HTML buttons inside the list can call it!
window.saveUserChange = async (targetUid) => {
    // 1. Find the inputs for this specific user
    const newRole = document.getElementById(role-${targetUid}).value;
    const newUni = document.getElementById(uni-${targetUid}).value;
    const newSem = document.getElementById(sem-${targetUid}).value;
    const newAdminStatus = document.getElementById(admin-${targetUid}).checked;

    // 2. Save to Database
    try {
        const btn = document.getElementById(btn-${targetUid});
        btn.innerText = "Saving...";
        
        await updateDoc(doc(db, "users", targetUid), {
            role: newRole,
            university: newUni,
            semester: newSem,
            isAdmin: newAdminStatus
        });

        btn.innerText = "✅ Updated!";
        setTimeout(() => btn.innerText = "Update User", 2000);
    } catch (error) {
        alert("Error updating user: " + error.message);
    }
};

// --- 2. AUTHENTICATION & LOGIN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        adminSection.classList.add("hidden"); // Reset UI
        adminResults.classList.add("hidden");
        loginScreen.classList.add("hidden");
        profileScreen.classList.remove("hidden");

        // Show My Info
        document.getElementById("user-name").innerText = user.displayName;
        document.getElementById("user-email").innerText = user.email;
        document.getElementById("user-photo").src = user.photoURL;

        // Load My Data
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("role-input").value = data.role || "";
            document.getElementById("uni-input").value = data.university || "";
            document.getElementById("sem-input").value = data.semester || "Sem 1";
            
            // Check Admin Status
            if (data.isAdmin === true) {
                adminSection.classList.remove("hidden");
            }
        }
    } else {
        loginScreen.classList.remove("hidden");
        profileScreen.classList.add("hidden");
    }
});

// Button Actions
document.getElementById("login-btn").addEventListener("click", () => signInWithPopup(auth, provider));
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

document.getElementById("save-btn").addEventListener("click", async () => {
    const user = auth.currentUser;
    if (user) {
        await setDoc(doc(db, "users", user.uid), {
            name: user.displayName,
            email: user.email,
            role: document.getElementById("role-input").value,
            university: document.getElementById("uni-input").value,
            semester: document.getElementById("sem-input").value
        }, { merge: true });
        alert("Profile Saved!");
    }
});

// --- 3. SUPER ADMIN: GENERATE EDITABLE LIST ---
document.getElementById("admin-btn").addEventListener("click", async () => {
    const resultBox = document.getElementById("admin-results");
    resultBox.innerHTML = "Loading...";
    resultBox.classList.remove("hidden");

    const querySnapshot = await getDocs(collection(db, "users"));
    resultBox.innerHTML = ""; // Clear loading text

    querySnapshot.forEach((doc) => {
        const u = doc.data();
        const uid = doc.id; // We need the ID to update specific users

        // We create a mini-form for EACH user
        // Notice we disable the Email input so you can't break their login
        resultBox.innerHTML += `
            <div class="user-card">
                <h4>${u.name} <span style="font-size:0.8em; color:gray;">(${u.email})</span></h4>
                
                <label>Role:</label>
                <input type="text" id="role-${uid}" value="${u.role || ''}">
                
                <label>University:</label>
                <input type="text" id="uni-${uid}" value="${u.university || ''}">
                
                <label>Semester:</label>
                <input type="text" id="sem-${uid}" value="${u.semester || ''}">
                
                <label style="color:red; font-weight:bold;">
                    <input type="checkbox" id="admin-${uid}" ${u.isAdmin ? 'checked' : ''}> 
                    Is Admin?
                </label>

                <button id="btn-${uid}" class="btn-update" onclick="window.saveUserChange('${uid}')">
                    Update User
                </button>
            </div>
        `;
    });
});
