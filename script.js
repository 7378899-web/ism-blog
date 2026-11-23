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
  onSnapshot,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

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
      formHeading.textContent = "Новый запись";
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
      (post.likes || 0) + (alreadyLiked ? -1 : 1),
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

// --- АВТОРИЗАЦИЯ И МОДАЛЬНОЕ ОКНО ---
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const authModal = document.getElementById("auth-modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

const userInfo = document.getElementById("user-info");
const userName = document.getElementById("user-name");
const userAvatar = document.getElementById("user-avatar");
const authError = document.getElementById("auth-error");

const emailInput = document.getElementById("auth-email");
const passInput = document.getElementById("auth-password");
const nameInput = document.getElementById("reg-name");

// Открытие и закрытие окна
openModalBtn.addEventListener(
  "click",
  () => (authModal.style.display = "flex"),
);
closeModalBtn.addEventListener(
  "click",
  () => (authModal.style.display = "none"),
);
window.addEventListener("click", (e) => {
  if (e.target === authModal) authModal.style.display = "none";
});

// 1. Словарь понятных ошибок Firebase Auth
function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case "auth/network-request-failed":
      return "Ошибка сети. Проверьте интернет или настройки VPN.";
    case "auth/email-already-in-use":
      return "Этот email уже занят. Попробуйте войти.";
    case "auth/invalid-email":
      return "Некорректный формат почты.";
    case "auth/weak-password":
      return "Слишком простой пароль (нужно от 6 символов).";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Неверная почта или пароль.";
    case "auth/too-many-requests":
      return "Слишком много попыток. Попробуйте позже.";
    case "auth/popup-closed-by-user":
      return "Окно входа через Google было закрыто.";
    case "auth/popup-blocked":
      return "Браузер заблокировал всплывающее окно. Разрешите их для сайта.";
    case "auth/cancelled-popup-request":
      return "Запрос на вход отменён. Нажмите кнопку ещё раз.";
    case "auth/unauthorized-domain":
      return "Этот домен не добавлен в разрешённые в настройках Firebase.";
    default:
      return "Ошибка: " + errorCode;
  }
}

// 2. Вспомогательная функция с блокировкой кнопки
async function runAuthAction(button, loadingText, action) {
  authError.textContent = "";
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;

  try {
    await action();
  } catch (err) {
    authError.textContent = getAuthErrorMessage(err.code);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

// 3. Регистрация по Email и паролю
const registerBtn = document.getElementById("email-reg-btn");
registerBtn.addEventListener("click", () => {
  runAuthAction(registerBtn, "Создание...", async () => {
    const email = emailInput.value.trim();
    const pass = passInput.value;
    const name = nameInput.value.trim() || email.split("@")[0];

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pass,
    );
    await updateProfile(userCredential.user, { displayName: name });
    userName.textContent = name;
  });
});

// 4. Вход по Email и паролю
const loginBtn = document.getElementById("email-login-btn");
loginBtn.addEventListener("click", () => {
  runAuthAction(loginBtn, "Вход...", async () => {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passInput.value,
    );
  });
});

// 5. Вход через Google
const googleBtn = document.getElementById("google-login-btn");
googleBtn.addEventListener("click", () => {
  runAuthAction(googleBtn, "Ожидание Google...", async () => {
    await signInWithPopup(auth, googleProvider);
  });
});

// Выход
document
  .getElementById("logout-btn")
  .addEventListener("click", () => signOut(auth));

// Список UID администраторов (сюда можно добавить второго админа через запятую)
const ADMIN_UIDS = ["DOUzmm6N1gMYFoIETQR7qSf3coz2"];
const postForm = document.querySelector(".post-form");

// Проверка статуса входа
onAuthStateChanged(auth, (user) => {
  const authBox =
    document.getElementById("auth-section") ||
    document.querySelector(".auth-section");
  if (user) {
    if (authBox) authBox.style.display = "none";
    if (authModal) authModal.style.display = "none";
    if (openModalBtn) openModalBtn.style.display = "none";
    if (userInfo) userInfo.style.display = "flex";
    if (userName) userName.textContent = user.displayName || user.email;
    if (userAvatar)
      userAvatar.src =
        user.photoURL ||
        `https://ui-avatars.com{encodeURIComponent(user.displayName || user.email)}`;
    // Показываем форму создания постов только администраторам из списка
    if (postForm) {
      postForm.style.display = ADMIN_UIDS.includes(user.uid) ? "block" : "none";
    }
  } else {
    if (authBox) authBox.style.display = "block";
    openModalBtn.style.display = "block";
    userInfo.style.display = "none";

    // Для неавторизованных гостей форму создания постов скрываем
    if (postForm) {
      postForm.style.display = "none";
    }
  }
});

// --- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (БЛОГ / ПОРТФОЛИО / ЧАТ) ---
const navBtns = document.querySelectorAll(".nav-btn");
const tabContents = document.querySelectorAll(".tab-content");

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    navBtns.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((t) => (t.style.display = "none"));

    btn.classList.add("active");
    const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
    if (targetTab) targetTab.style.display = "block";
  });
});

// --- ЛОГИКА РАЗДЕЛА «ПОРТФОЛИО» ---
const portfolioForm = document.getElementById("portfolio-admin-form");
const portfolioGrid = document.getElementById("portfolio-grid");
const addProjBtn = document.getElementById("add-proj-btn");

// Дополняем проверку прав админа для формы портфолио
onAuthStateChanged(auth, (user) => {
  const isAdmin = user && ADMIN_UIDS.includes(user.uid);
  if (portfolioForm) portfolioForm.style.display = isAdmin ? "block" : "none";
  loadPortfolio(isAdmin);
});

function compressImage(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

if (addProjBtn) {
  addProjBtn.addEventListener("click", async () => {
    const title = document.getElementById("proj-title").value.trim();
    const imgUrl = document.getElementById("proj-img").value.trim();
    const fileInput = document.getElementById("proj-file");
    const rawLink = document.getElementById("proj-link").value.trim();
    const link =
      rawLink && !rawLink.startsWith("http") ? `https://${rawLink}` : rawLink;
    const desc = document.getElementById("proj-desc").value.trim();

    if (!title || !desc) return alert("Заполните название и описание проекта!");

    let finalImg = imgUrl || "https://placehold.co";

    if (fileInput && fileInput.files && fileInput.files[0]) {
      try {
        finalImg = await compressImage(fileInput.files[0]);
      } catch (e) {
        return alert("Не удалось обработать изображение");
      }
    }

    await addDoc(collection(db, "portfolio"), {
      title,
      img: finalImg,
      link,
      desc,
      createdAt: serverTimestamp(),
    });

    document.getElementById("proj-title").value = "";
    document.getElementById("proj-img").value = "";
    if (fileInput) fileInput.value = "";
    document.getElementById("proj-link").value = "";
    document.getElementById("proj-desc").value = "";
    loadPortfolio(true);
  });
}

// Загрузка и отрисовка карточек портфолио
async function loadPortfolio(isAdmin = false) {
  if (!portfolioGrid) return;
  const q = query(collection(db, "portfolio"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  portfolioGrid.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const item = docSnap.data();
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <img src="${item.img}" alt="${item.title}" onerror="this.onerror=null; this.src='https://placehold.co/600x400';">
      <div class="project-card-body">
        <h3>${item.title}</h3>
        <p>${item.desc}</p>
        <div class="project-actions">
          ${item.link ? `<a href="${item.link}" target="_blank" rei="noopener noreferrer" class="project-link">Смотреть проект →</a>` : `<span></span>`}
          ${isAdmin ? `<button type="button" class="delete-proj-btn" data-id="${docSnap.id}">Удалить</button>` : ""}
        </div>
      </div>
    `;
    portfolioGrid.appendChild(card);
  });

  // Удаление проекта для админа
  if (isAdmin) {
    document.querySelectorAll(".delete-proj-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("Удалить этот проект из портфолио?")) {
          await deleteDoc(doc(db, "portfolio", btn.dataset.id));
          loadPortfolio(true);
        }
      });
    });
  }
}
// --- ЛОГИКА ЖИВОГО ЧАТА ---
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");
const chatLoginHint = document.getElementById("chat-login-hint");

let currentChatUser = null;
let isChatAdmin = false;

onAuthStateChanged(auth, (user) => {
  currentChatUser = user;
  isChatAdmin = user && ADMIN_UIDS.includes(user.uid);

  // Показываем или скрываем панель создания поста
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel) {
    adminPanel.style.display = isChatAdmin ? "block" : "none";
  }

  // Закрываем окно входа, если пользователь успешно вошел
  if (user && typeof authModal !== "undefined") {
    authModal.style.display = "none";
  }

  if (chatForm && chatLoginHint) {
    chatForm.style.display = user ? "flex" : "none";
    chatLoginHint.style.display = user ? "none" : "block";
  }
});

if (chatMessages) {
  const chatQuery = query(collection(db, "chat"), orderBy("createdAt", "asc"));

  onSnapshot(chatQuery, (snapshot) => {
    chatMessages.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const isOwn = currentChatUser && msg.uid === currentChatUser.uid;

      const msgDiv = document.createElement("div");
      msgDiv.className = `chat-msg ${isOwn ? "own" : ""}`;

      const safeText = document.createElement("div");
      safeText.textContent = msg.text; // Защита от HTML-инъекций
      msgDiv.innerHTML = `
        <div class="chat-msg-header">
          <span>${msg.author || "Пользователь"}</span>
          ${isChatAdmin || isOwn ? `<button class="chat-del-btn" data-id="${docSnap.id}">Удалить</button>` : ""}
        </div>
      `;
      msgDiv.appendChild(safeText);
      chatMessages.appendChild(msgDiv);
    });

    // Автопрокрутка к последнему сообщению
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Удаление сообщений
    chatMessages.querySelectorAll(".chat-del-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "chat", btn.dataset.id));
      });
    });
  });
}

async function sendChatMessage() {
  if (!currentChatUser || !chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  const authorName =
    currentChatUser.displayName ||
    currentChatUser.email?.split("@")[0] ||
    "Участник";

  await addDoc(collection(db, "chat"), {
    text,
    author: authorName,
    uid: currentChatUser.uid,
    createdAt: serverTimestamp(),
  });
}
if (sendChatBtn) sendChatBtn.addEventListener("click", sendChatBtn);
if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });
}

// Переключение между вкладками Вход и Регистрация
const authTabs = document.querySelectorAll(".auth-tab");
const regNameInput = document.getElementById("reg-name");
const emailLoginBtn = document.getElementById("email-login-btn");
const emailRegBtn = document.getElementById("email-reg-btn");
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    if (authError) authError.textContent = "";

    if (tab.dataset.mode === "register") {
      regNameInput.classList.remove("hidden");
      emailLoginBtn.classList.add("hidden");
      emailRegBtn.classList.remove("hidden");
    } else {
      regNameInput.classList.add("hidden");
      emailLoginBtn.classList.remove("hidden");
      emailRegBtn.classList.add("hidden");
    }
  });
});
