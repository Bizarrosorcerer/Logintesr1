// 1. IMPORT FIREBASE TOOLS (CRITICAL: Added 'collection' and 'getDocs')
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

// 2. YOUR CONFIG
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

// 4. GET HTML ELEMENTS
const loginScreen = document.getElementById("login-screen");
const profileScreen = document.getElementById("profile-screen");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const statusMsg = document.getElementById("status-msg");

// Admin Elements
const adminSection = document.getElementById("admin-section");
const adminBtn = document.getElementById("admin-btn");
const adminResults = document.getElementById("admin-results");

// Input Fields
const roleInput = document.getElementById("role-input");
const uniInput = document.getElementById("uni-input");
const semInput = document.getElementById("sem-input");

// ==========================================
// LOGIC
// ==========================================

// LISTEN FOR LOGIN
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // RESET UI: Hide admin panel immediately to prevent leaks
        adminSection.classList.add("hidden");
        adminResults.classList.add("hidden");

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
            uniInput.value = data.university || ""; 
            semInput.value = data.semester || "Sem 1";
            
            // CHECK FOR ADMIN BADGE
            if (data.isAdmin === true) {
                adminSection.classList.remove("hidden"); // Reveal Admin Button
            }
        }
    } else {
        // LOGGED OUT
        loginScreen.classList.remove("hidden");
        profileScreen.classList.add("hidden");
        adminSection.classList.add("hidden");
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

// SAVE DATA
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
                // We do NOT save isAdmin here to protect it
            }, { merge: true });
            
            statusMsg.innerText = "✅ Profile Updated!";
            setTimeout(() => statusMsg.innerText = "", 3000);
        } catch (error) {
            console.error(error);
            statusMsg.innerText = "Error saving data";
        }
    }
});

// --- THE NEW CODE TO SHOW ALL USERS ---
// This was likely missing or incomplete before!
if (adminBtn) {
    adminBtn.addEventListener("click", async () => {
        adminResults.innerHTML = "Loading...";
        adminResults.classList.remove("hidden");
        
        try {
            // 1. Get all documents from the "users" collection
            const querySnapshot = await getDocs(collection(db, "users"));
            
            // 2. Clear the box
            adminResults.innerHTML = "<h3>User List:</h3>";
            
            // 3. Loop through each user and add them to the box
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                adminResults.innerHTML += `
                    <div style="border-bottom: 1px solid #ccc; padding: 10px; margin-bottom: 5px;">
                        <strong>Name:</strong> ${userData.name} <br>
                        <small>Email: ${userData.email}</small> <br>
                        <small>Role: ${userData.role || "Not set"}</small>
                    </div>
                `;
            });
        } catch (error) {
            console.error(error);
            adminResults.innerText = "Error fetching users! (Check Console)";
        }
    });
}
