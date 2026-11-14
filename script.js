const titleInput = document.getElementById("postTitle");
const tagSelect = document.getElementById("postTag");
const textInput = document.getElementById("postText");
const publishBtn = document.getElementById("publishBtn");
const feedContainer = document.getElementById("feedContainer");
const toggleModeBtn = document.getElementById("toggleModeBtn");
const searchInput = document.getElementById("searchInput");
const tagsFilter = document.getElementById("tagsFilter");
const formHeading = document.getElementById("formHeading");

let editingPostId = null;
let activeTag = "Все";

let posts = JSON.parse(localStorage.getItem("schoolBlogPosts")) || [
  {
    id: 1,
    title: "Мой первый пост в блоге!",
    tag: "Хобби",
    text: "Всем привет! Я начал изучать веб-разработку и сделал свой блог.",
    date: "13.11.2026",
    likes: 0,
    isLiked: false,
  },
];

function savePosts() {
  localStorage.setItem("schoolBlogPosts", JSON.stringify(posts));
}

toggleModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("reader-mode");
  const isReader = document.body.classList.contains("reader-mode");
  toggleModeBtn.textContent = isReader ? "Режим админа" : "Режим читателя";
});

searchInput.addEventListener("input", renderPosts);

// Фильтрация по клику на тег
tagsFilter.addEventListener("click", (event) => {
  if (!event.target.classList.contains("filter-btn")) return;

  document
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  activeTag = event.target.dataset.tag;
  renderPosts();
});

function renderPosts() {
  feedContainer.innerHTML = "";
  const query = searchInput.value.toLowerCase().trim();

  posts
    .filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(query) ||
        post.text.toLowerCase().includes(query);
      const matchesTag = activeTag === "Все" || post.tag === activeTag;
      return matchesSearch && matchesTag;
    })
    .forEach((post) => {
      const newCard = document.createElement("article");
      newCard.className = "ent-card";
      newCard.dataset.id = post.id;

      // Бейдж тега
      const tagBadge = document.createElement("span");
      tagBadge.className = "post-tag-badge";
      tagBadge.textContent = "#" + (post.tag || "Хобби");

      const newTitle = document.createElement("h2");
      newTitle.textContent = post.title;

      const newDate = document.createElement("small");
      newDate.className = "post-date";
      newDate.textContent = post.date || "Без даты";

      const newText = document.createElement("p");
      newText.textContent = post.text;

      const actionsDiv = document.createElement("div");
      actionsDiv.className = "card-actions";

      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.className = post.isLiked ? "like-btn liked" : "like-btn";
      likeBtn.textContent = "❤️ " + (post.likes || 0);

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "edit-btn";
      editBtn.textContent = "Редактировать";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "Удалить";

      actionsDiv.append(likeBtn, editBtn, deleteBtn);
      newCard.append(tagBadge, newTitle, newDate, newText, actionsDiv);
      feedContainer.appendChild(newCard);
    });
}

publishBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();
  const tag = tagSelect.value;
  const text = textInput.value.trim();

  if (!title || !text) {
    alert("Пожалуйста, заполните заголовок и текст!");
    return;
  }

  if (editingPostId !== null) {
    const postToEdit = posts.find((p) => p.id === editingPostId);
    if (postToEdit) {
      postToEdit.title = title;
      postToEdit.tag = tag;
      postToEdit.text = text;
    }
    editingPostId = null;
    formHeading.textContent = "Панель администратора: Новый пост";
    publishBtn.textContent = "Опубликовать";
  } else {
    posts.unshift({
      id: Date.now(),
      title: title,
      tag: tag,
      text: text,
      date: new Date().toLocaleDateString("ru-RU"),
      likes: 0,
      isLiked: false,
    });
  }

  savePosts();
  renderPosts();

  titleInput.value = "";
  textInput.value = "";
});

feedContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".ent-card");
  if (!card) return;
  const postId = Number(card.dataset.id);

  if (event.target.classList.contains("delete-btn")) {
    posts = posts.filter((post) => post.id !== postId);
  } else if (event.target.classList.contains("like-btn")) {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      post.isLiked = !post.isLiked;
      post.likes = (post.likes || 0) + (post.isLiked ? 1 : -1);
    }
  } else if (event.target.classList.contains("edit-btn")) {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      titleInput.value = post.title;
      tagSelect.value = post.tag || "Хобби";
      textInput.value = post.text;
      editingPostId = post.id;
      formHeading.textContent = "Редактирование поста";
      publishBtn.textContent = "Сохранить изменения";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  } else {
    return;
  }

  savePosts();
  renderPosts();
});

renderPosts();

