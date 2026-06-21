document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const authMessageDiv = document.getElementById("auth-message");
  const authNote = document.querySelector(".auth-note");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("teacher-password");
  const usernameInput = document.getElementById("teacher-username");

  let authToken = null;

  function setAuthState(loggedIn) {
    const inputs = [emailInput, activitySelect, signupForm.querySelector("button")];
    inputs.forEach((input) => {
      input.disabled = !loggedIn;
    });

    if (loggedIn) {
      loginForm.classList.add("hidden");
      logoutButton.classList.remove("hidden");
      authNote.textContent = "Teacher is logged in. You may register or unregister students.";
    } else {
      loginForm.classList.remove("hidden");
      logoutButton.classList.add("hidden");
      authNote.textContent = "Only teachers may register or unregister students.";
      authToken = null;
      usernameInput.value = "";
      passwordInput.value = "";
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.disabled = !authToken;
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined,
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle login submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (response.ok) {
        authToken = result.token;
        authMessageDiv.textContent = `Logged in as ${result.username}`;
        authMessageDiv.className = "message success";
        authMessageDiv.classList.remove("hidden");
        setAuthState(true);
        fetchActivities();
      } else {
        authMessageDiv.textContent = result.detail || "Login failed";
        authMessageDiv.className = "message error";
        authMessageDiv.classList.remove("hidden");
      }
    } catch (error) {
      authMessageDiv.textContent = "Login request failed. Please try again.";
      authMessageDiv.className = "message error";
      authMessageDiv.classList.remove("hidden");
      console.error("Login error:", error);
    }

    setTimeout(() => {
      authMessageDiv.classList.add("hidden");
    }, 5000);
  });

  // Handle logout
  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (error) {
      // Ignore logout errors and just clear state
    }

    setAuthState(false);
    fetchActivities();
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined,
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  setAuthState(false);
  fetchActivities();
});
