(function () {
  var USERS_KEY = "phTravelogueUsers";
  var SESSION_KEY = "phTravelogueSession";

  function getUsers() {
    var storedUsers = localStorage.getItem(USERS_KEY);
    if (!storedUsers) {
      return [];
    }

    try {
      var users = JSON.parse(storedUsers);
      return Array.isArray(users) ? users : [];
    } catch (error) {
      console.error("Unable to read saved demo accounts:", error);
      return [];
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

  function initializeLogin() {
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

    if (currentPage === "login.html") {
      if (getSession()) {
        window.location.replace("index.html");
        return;
      }
    } else if (protectedPages.indexOf(currentPage) !== -1 && !getSession()) {
      window.location.replace("login.html");
      return;
    }

    var loginForm = document.getElementById("login-form");
    var registerForm = document.getElementById("register-form");

    if (loginForm) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var username = document.getElementById("login-username").value.trim();
        var password = document.getElementById("login-password").value;
        var account = username.toLowerCase() === "admin" && password === "111209"
          ? { username: "admin", role: "admin" }
          : getUsers().find(function (user) {
            return user.username.toLowerCase() === username.toLowerCase() &&
              user.password === password;
          });

        if (!account) {
          showStatus("That username or password is not correct.", true);
          return;
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          username: account.username,
          role: account.role
        }));
        window.location.href = account.role === "admin" ? "admin.html" : "index.html";
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var username = document.getElementById("register-username").value.trim();
        var password = document.getElementById("register-password").value;
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username) || username.toLowerCase() === "admin") {
          showStatus("Choose a username with 3–24 letters, numbers, or underscores (not admin).", true);
          return;
        }
        if (password.length < 4 || password.length > 60) {
          showStatus("Choose a password between 4 and 60 characters.", true);
          return;
        }
        var users = getUsers();
        if (users.some(function (user) {
          return user.username.toLowerCase() === username.toLowerCase();
        })) {
          showStatus("That username is already registered in this browser.", true);
          return;
        }
        users.push({ username: username, password: password, role: "user" });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        registerForm.reset();
        showStatus("Account created. You can now log in.", false);
      });
    }
  }

  function getSession() {
    var storedSession = localStorage.getItem(SESSION_KEY);
    if (!storedSession) {
      return null;
    }
    try {
      return JSON.parse(storedSession);
    } catch (error) {
      console.error("Unable to read the demo login session:", error);
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function protectPage(requiredRole) {
    var session = getSession();
    if (!session || (requiredRole && session.role !== requiredRole)) {
      window.location.replace("login.html");
      return null;
    }
    return session;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = "login.html";
  }

  window.TravelogueAuth = {
    initializeLogin: initializeLogin,
    protectPage: protectPage,
    getSession: getSession,
    logout: logout
  };

  document.addEventListener("DOMContentLoaded", initializeLogin);
})();
