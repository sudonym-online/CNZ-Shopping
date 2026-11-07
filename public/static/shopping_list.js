document.addEventListener("DOMContentLoaded", () => {
  const svgSymbol = `
      <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
        <symbol id="todo-checkbox-symbol" viewBox="0 0 22 22">
          <path fill="none" stroke="currentColor" d="M5.5,11.3L9,14.8L20.2,3.3l0,0c-0.5-1-1.5-1.8-2.7-1.8h-13c-1.7,0-3,1.3-3,3v13c0,1.7,1.3,3,3,3h13 c1.7,0,3-1.3,3-3v-13c0-0.4-0.1-0.8-0.3-1.2"/>
        </symbol>
      </svg>
    `;
  document.body.insertAdjacentHTML("beforeend", svgSymbol);

  const startBtn = document.getElementById("start-btn");
  const eventInput = document.getElementById("event-input");
  const todoTitle = document.getElementById("todo-title");
  const todoItems = document.getElementById("todo-items");
  todoItems.classList.add("todo-list-grid");
  const addItemBtn = document.getElementById("add-item-btn");

  const newListBtn = document.getElementById("new-list-btn");
  const listMessage = document.getElementById("list-message");
  const header = document.querySelector(".header");
  const description = document.querySelector(".description");

  const STORAGE_KEY = "cnz-shopping-list";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  let currentEvent = "";
  let accepted = [];
  let rejected = [];

  function save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ event: currentEvent, accepted, rejected }),
      );
    } catch (e) {}
  }

  function showList() {
    header.style.display = "none";
    description.style.display = "none";
    todoTitle.textContent = `"${currentEvent}"`;
    eventInput.style.display = "none";
    startBtn.style.display = "none";
    todoTitle.style.display = "block";
    addItemBtn.style.display = "block";
    newListBtn.style.display = "block";
    addItemBtn.textContent = "+ Generate another...";
    addItemBtn.disabled = false;
    renderTodoList();
  }

  function showStart() {
    header.style.display = "";
    description.style.display = "";
    eventInput.style.display = "";
    startBtn.style.display = "";
    todoTitle.style.display = "none";
    addItemBtn.style.display = "none";
    newListBtn.style.display = "none";
    listMessage.textContent = "";
    todoItems.innerHTML = "";
    eventInput.value = "";
    eventInput.focus();
  }

  function startList() {
    currentEvent = eventInput.value.trim();
    if (!currentEvent) {
      eventInput.focus();
      return;
    }
    accepted = [];
    rejected = [];
    listMessage.textContent = "";
    save();
    showList();
    getNextItem();
  }

  startBtn.addEventListener("click", startList);
  eventInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startList();
  });

  newListBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    currentEvent = "";
    accepted = [];
    rejected = [];
    showStart();
  });

  addItemBtn.addEventListener("click", getNextItem);

  async function getNextItem() {
    addItemBtn.textContent = "Loading...";
    addItemBtn.disabled = true;
    listMessage.textContent = "";

    try {
      const response = await fetch("/get_shopping_list_item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: currentEvent,
          accepted: accepted.map((i) => i.item),
          rejected: rejected,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "The request failed.");
      }

      if (!data.item) {
        addItemBtn.textContent = "No more items to suggest.";
        return;
      }

      accepted.push(data);
      save();
      renderTodoList();
      addItemBtn.textContent = "+ Generate another...";
      addItemBtn.disabled = false;
    } catch (error) {
      listMessage.textContent = error.message || "The request failed.";
      addItemBtn.textContent = "Try again";
      addItemBtn.disabled = false;
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.event === "string" && saved.event && Array.isArray(saved.accepted) && Array.isArray(saved.rejected)) {
      currentEvent = saved.event;
      accepted = saved.accepted;
      rejected = saved.rejected;
      showList();
    }
  } catch (e) {}

  function renderTodoList() {
    todoItems.innerHTML = "";
    accepted.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "suggested-item";
      if (item.completed) {
        li.classList.add("completed");
      }

      li.innerHTML = `
                <div class="item-details">
                  <div class="todo-checkbox-wrapper">
                    <span class="todo-checkbox">
                      <input type="checkbox" aria-label="Mark ${esc(item.item)} as done" ${item.completed ? "checked" : ""}>
                      <svg>
                        <use xlink:href="#todo-checkbox-symbol" class="todo-checkbox"></use>
                      </svg>
                    </span>
                  </div>
                  <div class="item-text">
                      <span class="item-name">${esc(item.item)}</span>
                      <span class="item-reason">${item.reason ? `- ${esc(item.reason)}` : ""}</span>
                  </div>
                  <span class="item-price">${esc(item.price || "N/A")}</span>
                  <button class="search-btn" aria-label="Search for ${esc(item.item)}">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#444"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>
                  </button>
                  <button class="delete-btn" aria-label="Delete ${esc(item.item)}">&times;</button>
                </div>
              `;

      const checkboxInput = li.querySelector("input[type='checkbox']");
      if (checkboxInput) {
        checkboxInput.addEventListener("change", () => {
          accepted[index].completed = !accepted[index].completed;
          save();
          renderTodoList();
        });
      }

      const deleteBtn = li.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          rejected.push(accepted[index].item);
          accepted.splice(index, 1);
          save();
          renderTodoList();
        });
      }

      const searchBtn = li.querySelector(".search-btn");
      if (searchBtn) {
        searchBtn.addEventListener("click", () => {
          const itemName = encodeURIComponent(accepted[index].item);
          window.location.href = `/?q=${itemName}`;
        });
      }
      todoItems.appendChild(li);
    });
  }
});
