document.addEventListener("DOMContentLoaded", () => {
  const compareBtn = document.getElementById("compare-btn");
  const inputsWrapper = document.querySelector(".inputs-wrapper");
  const addBtn = document.getElementById("add-btn");
  const resultsDiv = document.getElementById("comparison-results");

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  const spinnerFrames = [
    "⠁",
    "⠂",
    "⠄",
    "⡀",
    "⡈",
    "⡐",
    "⡠",
    "⣀",
    "⣁",
    "⣂",
    "⣄",
    "⣌",
    "⣔",
    "⣤",
    "⣥",
    "⣦",
    "⣮",
    "⣶",
    "⣷",
    "⣿",
    "⡿",
    "⠿",
    "⢟",
    "⠟",
    "⡛",
    "⠛",
    "⠫",
    "⢋",
    "⠋",
    "⠍",
    "⡉",
    "⠉",
    "⠑",
    "⠡",
    "⢁",
  ];

  addBtn.addEventListener("click", () => {
    const newInputGroup = document.createElement("div");
    newInputGroup.classList.add("input-group");

    const newInput = document.createElement("input");
    newInput.classList.add("item-input");
    newInput.type = "text";
    newInput.placeholder = "Enter item name";
    newInput.setAttribute("aria-label", "Product name");

    newInputGroup.appendChild(newInput);
    inputsWrapper.insertBefore(newInputGroup, addBtn.parentElement);
  });

  inputsWrapper.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches(".item-input")) {
      compareBtn.click();
    }
  });

  function showError(message) {
    resultsDiv.innerHTML = `<p>${esc(message)}</p>`;
  }

  function renderResults(data) {
    document.querySelector(".compare-inputs").style.display = "none";
    const header = document.querySelector(".header");
    if (header) header.style.display = "none";
    const description = document.querySelector(".description");
    if (description) description.style.display = "none";

    const sidebarResults = document.getElementById("sidebar-results");
    sidebarResults.innerHTML = `
      <h3 class="distinctions">Distinctions</h3>
      <p class="distinctions-text">${esc(data.distinctions)}</p>
      <h3 class="recommendations">Recommendations</h3>
      <p class="recommendations-text">${esc(data.recommend)}</p>
    `;
    sidebarResults.style.transition = "transform 0.3s ease-out";

    if (!document.getElementById("sidebar-toggle")) {
      const sidebarToggle = document.createElement("div");
      sidebarToggle.id = "sidebar-toggle";
      sidebarToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      `;
      document.body.appendChild(sidebarToggle);
      sidebarToggle.addEventListener("click", () => {
        sidebarResults.classList.toggle("collapsed");
        sidebarToggle.classList.toggle("collapsed");
      });
    }
    sidebarResults.style.display = "block";

    resultsDiv.innerHTML = `
      <button id="new-comparison-btn" class="new-comparison-btn">New comparison</button>
      <h3 class="comparison-results">Comparison Results</h3>
      <br>
      <div id="comparison-items-wrapper"></div>
    `;
    document
      .getElementById("new-comparison-btn")
      .addEventListener("click", () => location.assign("/compare"));

    const itemsWrapper = document.getElementById("comparison-items-wrapper");
    data.table.forEach((element) => {
      let specsHtml = "";
      element.specs.forEach((group) => {
        specsHtml += `<h5 class="spec-group-name">${esc(group.groupName)}</h5>`;
        specsHtml += `<div class="specs-group">`;
        group.stats.forEach((stat) => {
          let statClass = "";
          if (stat.status === "good") {
            statClass = "good-stat";
          } else if (stat.status === "bad") {
            statClass = "bad-stat";
          }
          specsHtml += `
            <div class="spec-item ${statClass}">
              <span class="spec-name">${esc(stat.name)}:</span>
              <span class="spec-value">${esc(stat.value)}</span>
              ${stat.indicator ? `<span class="spec-indicator">${esc(stat.indicator)}</span>` : ""}
            </div>
          `;
        });
        specsHtml += `</div>`;
      });

      itemsWrapper.innerHTML += `
        <div class="comparison-item">
          <h4 class="comparison-item-name">${esc(element.item)}</h4>
          <h4 class="comparison-item-price">Price: ${esc(element.price)}</h4>
          <p class="pros"> Pros: ${esc(element.pros)}</p>
          <p class="cons"> Cons: ${esc(element.cons)}</p>
          <br></br>
          ${specsHtml}
        </div>
      `;
    });
  }

  compareBtn.addEventListener("click", async () => {
    const values = Array.from(inputsWrapper.querySelectorAll(".item-input"))
      .map((input) => input.value.trim())
      .filter((value) => value !== "");

    if (values.length < 2 || values.length > 5) {
      showError("Enter 2 to 5 products.");
      return;
    }

    let frameIndex = 0;
    resultsDiv.innerHTML = `<p id="compare-spinner"><span style="white-space:pre">${spinnerFrames[frameIndex]}</span> Loading comparison</p>`;
    const spinnerElem = document.getElementById("compare-spinner");
    const spinnerInterval = setInterval(() => {
      frameIndex = (frameIndex + 1) % spinnerFrames.length;
      spinnerElem.innerHTML = `<span style="white-space:pre">${spinnerFrames[frameIndex]}</span> Loading comparison`;
    }, 70);

    compareBtn.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch("/compare-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: values }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.error) {
        showError(data.error || "The comparison failed. Try again.");
        return;
      }
      if (!data.table) {
        showError("The comparison had no data. Try again.");
        return;
      }
      renderResults(data);
    } catch (error) {
      showError(
        error.name === "AbortError"
          ? "The comparison took too long. Try again."
          : "The comparison failed. Try again.",
      );
    } finally {
      clearTimeout(timeout);
      clearInterval(spinnerInterval);
      compareBtn.disabled = false;
    }
  });
});
