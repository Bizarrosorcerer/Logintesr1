// 1. IMPORT FIREBASE TOOLS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// 2. YOUR CONFIG (No changes needed here, keys are same)
const firebaseConfig = {
    apiKey: "AIzaSyDAUrjhba6zQS47RpS4jH0QyvAw3U7dlcw",
    authDomain: "logintester1-e9b27.firebaseapp.com",
    projectId: "logintester1-e9b27",
    storageBucket: "logintester1-e9b27.firebasestorage.app",
    messagingSenderId: "939798745204",
    appId: "1:939798745204:web:cc88423e2ed867734f0121"
};

// 3. START APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 4. GET HTML ELEMENTS (Updated list!)
const loginScreen = document.getElementById("login-screen");
const profileScreen = document.getElementById("profile-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Input Fields
const roleInput = document.getElementById("role-input");
const uniInput = document.getElementById("uni-input");   // NEW
const semInput = document.getElementById("sem-input");   // NEW

// ==========================================
// LOGIC
// ==========================================

// LISTEN FOR LOGIN
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.classList.add("hidden");
        profileScreen.classList.remove("hidden");

        document.getElementById("user-name").innerText = user.displayName;
        document.getElementById("user-email").innerText = user.email;
        document.getElementById("user-photo").src = user.photoURL;

        // LOAD DATA
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            roleInput.value = data.role || "";
            uniInput.value = data.university || ""; // Load Uni
            semInput.value = data.semester || "Sem 1"; // Load Semester
        }
    } else {
        loginScreen.classList.remove("hidden");
        profileScreen.classList.add("hidden");
    }
});

// LOGIN
loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => alert(error.message));
});

// LOGOUT
logoutBtn.addEventListener("click", () => {
    signOut(auth);
});

// SAVE (Updated to save 3 fields)
saveBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (user) {
        statusMsg.innerText = "Saving...";
        try {
            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName,
                email: user.email,
                role: roleInput.value,
                university: uniInput.value, // Save Uni
                semester: semInput.value    // Save Semester
            }, { merge: true });
            
            statusMsg.innerText = "✅ Profile Updated!";
            setTimeout(() => statusMsg.innerText = "", 3000); // Clear message after 3 sec
        } catch (error) {
            console.error(error);
            statusMsg.innerText = "Error saving data";
        }
    }
});
