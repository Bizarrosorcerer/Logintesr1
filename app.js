// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// 2. CONFIG
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

// ELEMENTS
const loginScreen = document.getElementById("login-screen");
const profileScreen = document.getElementById("profile-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");
const adminSection = document.getElementById("admin-section");
const adminBtn = document.getElementById("admin-btn");
const adminResults = document.getElementById("admin-results");

const roleInput = document.getElementById("role-input");
const uniInput = document.getElementById("uni-input");
const semInput = document.getElementById("sem-input");

// LOGIN LOGIC
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Reset UI
        adminSection.classList.add("hidden");
        adminResults.classList.add("hidden");
        loginScreen.classList.add("hidden");
        profileScreen.classList.remove("hidden");

        document.getElementById("user-name").innerText = user.displayName;
        document.getElementById("user-email").innerText = user.email;
        document.getElementById("user-photo").src = user.photoURL;

        // Load Data
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            roleInput.value = data.role || "";
            uniInput.value = data.university || ""; 
            semInput.value = data.semester || "Sem 1";
            
            if (data.isAdmin === true) {
                adminSection.classList.remove("hidden");
            }
        }
    } else {
        loginScreen.classList.remove("hidden");
        profileScreen.classList.add("hidden");
        adminSection.classList.add("hidden");
    }
});

// ACTIONS
loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => alert("Login Error: " + error.message));
});

logoutBtn.addEventListener("click", () => { signOut(auth); });

saveBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (user) {
        statusMsg.innerText = "Saving...";
        try {
            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName,
                email: user.email,
                role: roleInput.value,
                university: uniInput.value,
                semester: semInput.value
            }, { merge: true });
            statusMsg.innerText = "✅ Saved!";
        } catch (error) {
            alert("Save Error: " + error.message); // POPUP ERROR
        }
    }
});

// --- ADMIN DEBUGGER BUTTON ---
if (adminBtn) {
    adminBtn.addEventListener("click", async () => {
        // 1. Visual Feedback
        adminBtn.innerText = "Fetching Data..."; 
        adminResults.classList.remove("hidden");
        adminResults.innerHTML = "Loading from Database...";

        try {
            // 2. Fetch
            console.log("Attempting to fetch users...");
            const querySnapshot = await getDocs(collection(db, "users"));
            
            console.log("Found " + querySnapshot.size + " users.");
            
            if (querySnapshot.empty) {
                adminResults.innerHTML = "<h3>Database is Empty!</h3><p>No other users have clicked 'Save' yet.</p>";
                adminBtn.innerText = "Show All Users";
                return;
            }

            // 3. Display
            adminResults.innerHTML = "<h3>User List:</h3>";
            querySnapshot.forEach((doc) => {
                const u = doc.data();
                adminResults.innerHTML += `
                    <div style="border-bottom: 1px solid #ccc; padding: 5px;">
                        <strong>${u.name}</strong> (${u.role || "No Role"})<br>
                        <small>${u.email}</small>
                    </div>`;
            });
            adminBtn.innerText = "Show All Users";

        } catch (error) {
            // 4. ERROR POPUP (This will tell us the problem!)
            console.error(error);
            alert("ADMIN ERROR: " + error.message);
            adminResults.innerHTML = "Error: " + error.message;
            adminBtn.innerText = "Try Again";
        }
    });
}
