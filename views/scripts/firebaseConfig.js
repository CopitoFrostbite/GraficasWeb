import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2mOZQoo7TglXRBkFH6zYg35T4B9uTwKY",
    authDomain: "pawpush-2f014.firebaseapp.com",
    databaseURL: "https://pawpush-2f014-default-rtdb.firebaseio.com",
    projectId: "pawpush-2f014",
    storageBucket: "pawpush-2f014.appspot.com",
    messagingSenderId: "294052268906",
    appId: "1:294052268906:web:512db7f61d11c8ebf73313",
    measurementId: "G-79Q2V2CQDL"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };