

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC2j2b0-XvQTA_YAxvjDlMlewOIgJvAmMU",
  authDomain: "ism-blog-27d2f.firebaseapp.com",
  projectId: "ism-blog-27d2f",
  storageBucket: "ism-blog-27d2f.firebasestorage.app",
  messagingSenderId: "718712029051",
  appId: "1:718712029051:web:9fba640eaa38edfd4847de",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, "posts");

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
let posts = [];

// Запоминаем лайки текущего пользователя в браузере, чтобы он мог ставить/снимать свой лайк
let likedPostsIds = JSON.parse(localStorage.getItem("likedBlogPosts")) || [];

function saveLikedIds() {
  localStorage.setItem("likedBlogPosts", JSON.stringify(likedPostsIds));
}

// Загрузка постов из облачной базы данных Firebase
async function loadPosts() {
  feedContainer.innerHTML = "<p>Загрузка постов...</p>";
  try {
    const q = query(postsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    posts = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    renderPosts();
  } catch (error) {
    console.error("Ошибка при загрузке постов:", error);
    feedContainer.innerHTML =
      "<p>Не удалось загрузить посты. Проверьте правила доступа в Firebase.</p>";
  }
}

toggleModeBtn.addEventListener("click", () => {
  document.body.classList.toggle("reader-mode");
  const isReader = document.body.classList.contains("reader-mode");
  toggleModeBtn.textContent = isReader ? "Режим админа" : "Режим читателя";
});

searchInput.addEventListener("input", renderPosts);

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
  const queryText = searchInput.value.toLowerCase().trim();

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(queryText) ||
      post.text.toLowerCase().includes(queryText);
    const matchesTag = activeTag === "Все" || post.tag === activeTag;
    return matchesSearch && matchesTag;
  });

  if (filteredPosts.length === 0) {
    feedContainer.innerHTML = "<p>Записей пока нет.</p>";
    return;
  }

  filteredPosts.forEach((post) => {
    const newCard = document.createElement("article");
    newCard.className = "ent-card";
    newCard.dataset.id = post.id;

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

    const isLiked = likedPostsIds.includes(post.id);
    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    likeBtn.className = isLiked ? "like-btn liked" : "like-btn";
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

// Публикация или сохранение отредактированного поста в облако
publishBtn.addEventListener("click", async () => {
  const title = titleInput.value.trim();
  const tag = tagSelect.value;
  const text = textInput.value.trim();

  if (!title || !text) {
    alert("Пожалуйста, заполните заголовок и текст!");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "Сохранение...";

  try {
    if (editingPostId !== null) {
      const postRef = doc(db, "posts", editingPostId);
      await updateDoc(postRef, {
        title: title,
        tag: tag,
        text: text,
      });

      editingPostId = null;
      formHeading.textContent = "Панель администратора: Новый пост";
    } else {
      await addDoc(postsCollection, {
        title: title,
        tag: tag,
        text: text,
        date: new Date().toLocaleDateString("ru-RU"),
        likes: 0,
        createdAt: Date.now(),
      });
    }

    titleInput.value = "";
    textInput.value = "";
    await loadPosts();
  } catch (error) {
    console.error("Ошибка при сохранении поста:", error);
    alert("Не удалось сохранить пост. Проверьте консоль браузера (F12).");
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "Опубликовать";
  }
});

// Удаление, лайки и редактирование постов
feedContainer.addEventListener("click", async (event) => {
  const card = event.target.closest(".ent-card");
  if (!card) return;
  const postId = card.dataset.id;

  if (event.target.classList.contains("delete-btn")) {
    try {
      await deleteDoc(doc(db, "posts", postId));
      await loadPosts();
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      alert("Не удалось удалить пост.");
    }
  } else if (event.target.classList.contains("like-btn")) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const alreadyLiked = likedPostsIds.includes(postId);
    const newLikesCount = Math.max(
      0,
      (post.likes || 0) + (alreadyLiked ? -1 : 1)
    );

    if (alreadyLiked) {
      likedPostsIds = likedPostsIds.filter((id) => id !== postId);
    } else {
      likedPostsIds.push(postId);
    }
    saveLikedIds();

    post.likes = newLikesCount;
    renderPosts();

    try {
      await updateDoc(doc(db, "posts", postId), {
        likes: newLikesCount,
      });
    } catch (error) {
      console.error("Ошибка при обновлении лайка:", error);
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
  }
});

// Загружаем посты из сети при открытии страницы
loadPosts();

