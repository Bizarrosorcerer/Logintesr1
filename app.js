// 1. IMPORT FIREBASE TOOLS
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// 2. YOUR SPECIFIC KEYS (I added these for you!)
const firebaseConfig = {
    apiKey: "AIzaSyDAUrjhba6zQS47RpS4jH0QyvAw3U7dlcw",
    authDomain: "logintester1-e9b27.firebaseapp.com",
    projectId: "logintester1-e9b27",
    storageBucket: "logintester1-e9b27.firebasestorage.app",
    messagingSenderId: "939798745204",
    appId: "1:939798745204:web:cc88423e2ed867734f0121"
};

// 3. START THE APP
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 4. GET HTML ELEMENTS
const loginScreen = document.getElementById("login-screen");
const profileScreen = document.getElementById("profile-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const roleInput = document.getElementById("role-input");
const statusMsg = document.getElementById("status-msg");

// ==========================================
// THE LOGIC
// ==========================================

// LISTEN FOR LOGIN/LOGOUT (Runs automatically)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is Logged In
        console.log("User:", user.email);
        loginScreen.classList.add("hidden");
        profileScreen.classList.remove("hidden");

        // Show User Info
        document.getElementById("user-name").innerText = user.displayName;
        document.getElementById("user-email").innerText = user.email;
        document.getElementById("user-photo").src = user.photoURL;

        // Load Saved Data from Database
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            roleInput.value = docSnap.data().role || "";
        }
    } else {
        // User is Logged Out
        loginScreen.classList.remove("hidden");
        profileScreen.classList.add("hidden");
    }
});

// LOGIN BUTTON CLICK
loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider).catch((error) => {
        alert("Login failed: " + error.message);
    });
});

// LOGOUT BUTTON CLICK
logoutBtn.addEventListener("click", () => {
    signOut(auth);
});

// SAVE BUTTON CLICK
saveBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (user) {
        statusMsg.innerText = "Saving...";
        try {
            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName,
                email: user.email,
                role: roleInput.value
            }, { merge: true });
            statusMsg.innerText = "Saved successfully!";
        } catch (error) {
            console.error(error);
            statusMsg.innerText = "Error saving data (Check Console)";
        }
    }
});
