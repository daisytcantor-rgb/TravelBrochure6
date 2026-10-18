(function () {
  var SESSION_KEY = "phTravelogueSession";
  var auth = null;
  var readyResolve;
  var ready = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  function initializeFirebaseAuth() {
    if (!window.firebase || !firebase.auth || !window.FIREBASE_CONFIG) {
      return false;
    }
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      auth = firebase.auth();
      auth.onAuthStateChanged(function () {
        var session = getSession();
        readyResolve(session);
        var currentPage = window.location.pathname.split("/").pop() || "index.html";
        var protectedPages = [
          "index.html",
          "about.html",
          "destinations.html",
          "gallery.html",
          "contact.html",
          "faq.html",
          "reviews.html",
          "admin.html"
        ];
        if (protectedPages.indexOf(currentPage) !== -1 && !session) {
          window.location.replace("login.html");
        }
      }, function (error) {
        console.error("Unable to check the signed-in account:", error);
        readyResolve(null);
      });
      return true;
    } catch (error) {
      console.error("Unable to initialize Firebase Authentication:", error);
      return false;
    }
  }

  function showStatus(message, isError) {
    var status = document.getElementById("auth-status");
    if (!status) {
      return;
    }
    status.textContent = message;
    status.className = isError ? "form-message review-error" : "form-message review-success";
    status.style.display = "block";
  }

  function setFormBusy(form, isBusy) {
    Array.prototype.forEach.call(form.querySelectorAll("button"), function (button) {
      button.disabled = isBusy;
    });
  }

  function firebaseErrorMessage(error) {
    var messages = {
      "auth/email-already-in-use": "An account already exists for that email. Try signing in instead.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/invalid-credential": "That email or password is not correct.",
      "auth/user-disabled": "This account has been disabled. Contact the site administrator.",
      "auth/user-not-found": "No account was found for that email.",
      "auth/wrong-password": "That email or password is not correct.",
      "auth/weak-password": "Choose a password with at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Please wait a little while and try again.",
      "auth/popup-closed-by-user": "The Google sign-in window was closed before sign-in finished.",
      "auth/popup-blocked": "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
      "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
      "auth/unauthorized-domain": "This website address is not authorized in Firebase Authentication."
    };
    return messages[error.code] || "Authentication could not be completed. Please try again.";
  }

  function showFirebaseError(error) {
    showStatus(firebaseErrorMessage(error), true);
    console.error("Firebase Authentication error:", error);
  }

  function finishSignIn() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  }

  function initializeLogin() {
    var loginForm = document.getElementById("login-form");
    var registerForm = document.getElementById("register-form");
    var demoAdminForm = document.getElementById("demo-admin-form");
    var resetButton = document.getElementById("reset-password-button");
    var googleButton = document.getElementById("google-sign-in-button");

    if (loginForm) {
      loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!auth) {
          showStatus("Email sign-in is unavailable. Check the Firebase setup instructions below.", true);
          return;
        }
        var email = document.getElementById("login-email").value.trim();
        var password = document.getElementById("login-password").value;
        setFormBusy(loginForm, true);
        try {
          await auth.signInWithEmailAndPassword(email, password);
          finishSignIn();
        } catch (error) {
          showFirebaseError(error);
        } finally {
          setFormBusy(loginForm, false);
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!auth) {
          showStatus("Account creation is unavailable. Check the Firebase setup instructions below.", true);
          return;
        }
        var email = document.getElementById("register-email").value.trim();
        var password = document.getElementById("register-password").value;
        setFormBusy(registerForm, true);
        try {
          await auth.createUserWithEmailAndPassword(email, password);
          finishSignIn();
        } catch (error) {
          showFirebaseError(error);
        } finally {
          setFormBusy(registerForm, false);
        }
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", async function () {
        if (!auth) {
          showStatus("Password reset is unavailable. Check the Firebase setup instructions below.", true);
          return;
        }
        var email = document.getElementById("login-email").value.trim();
        if (!email) {
          showStatus("Enter your email address in the sign-in form first.", true);
          document.getElementById("login-email").focus();
          return;
        }
        resetButton.disabled = true;
        try {
          await auth.sendPasswordResetEmail(email);
          showStatus("If an account exists for that email, a password-reset link has been sent.", false);
        } catch (error) {
          showFirebaseError(error);
        } finally {
          resetButton.disabled = false;
        }
      });
    }

    if (googleButton) {
      googleButton.addEventListener("click", async function () {
        if (!auth) {
          showStatus("Google sign-in is unavailable. Check the Firebase setup instructions below.", true);
          return;
        }
        googleButton.disabled = true;
        try {
          var provider = new firebase.auth.GoogleAuthProvider();
          await auth.signInWithPopup(provider);
          finishSignIn();
        } catch (error) {
          showFirebaseError(error);
        } finally {
          googleButton.disabled = false;
        }
      });
    }

    if (demoAdminForm) {
      demoAdminForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var username = document.getElementById("admin-username-input").value.trim();
        var password = document.getElementById("admin-password-input").value;
        if (username.toLowerCase() !== "admin" || password !== "111209") {
          showStatus("That demo administrator username or password is not correct.", true);
          return;
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: "admin", role: "admin" }));
        window.location.href = "admin.html";
      });
    }
  }

  function getSession() {
    var storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        var demoSession = JSON.parse(storedSession);
        if (demoSession && demoSession.role === "admin" && demoSession.username === "admin") {
          return demoSession;
        }
      } catch (error) {
        console.error("Unable to read the demo administrator session:", error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    if (auth && auth.currentUser) {
      return {
        username: auth.currentUser.displayName || auth.currentUser.email,
        email: auth.currentUser.email,
        uid: auth.currentUser.uid,
        role: "user",
        emailVerified: auth.currentUser.emailVerified
      };
    }
    return null;
  }

  function protectPage(requiredRole) {
    var session = getSession();
    if (!session || (requiredRole && session.role !== requiredRole)) {
      window.location.replace("login.html");
      return null;
    }
    return session;
  }

  async function logout() {
    localStorage.removeItem(SESSION_KEY);
    if (auth && auth.currentUser) {
      try {
        await auth.signOut();
      } catch (error) {
        console.error("Unable to sign out of Firebase Authentication:", error);
        showStatus("Sign-out failed. Please try again.", true);
        return;
      }
    }
    window.location.href = "login.html";
  }

  var firebaseReady = initializeFirebaseAuth();
  if (!firebaseReady) {
    readyResolve(null);
  }

  window.TravelogueAuth = {
    ready: ready,
    initializeLogin: initializeLogin,
    protectPage: protectPage,
    getSession: getSession,
    logout: logout
  };

  document.addEventListener("DOMContentLoaded", initializeLogin);
})();
