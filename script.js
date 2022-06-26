const allFiles = [];

const DargAndDropElement = document.getElementById("drop-zone");
// const filesInput = document.getElementById("files-input");
const uploadFilesButton = document.getElementById("uploadFiles");
const loginButton = document.getElementById("login");
loginButton.style.visibility = "hidden";

const CLIENT_ID =
  "510172276616-10ocqra9qehuiqf1f8158h6a1m1m1j6j.apps.googleusercontent.com";
const API_KEY = "AIzaSyCLsfbItmklumfCwl7zfRlu_ykzxb9jAxM";

const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

const SCOPES = "https://www.googleapis.com/auth/drive";

let tokenClient;
let gapiInited = false;
let gisInited = false;

function gapiLoaded() {
  gapi.load("client", intializeGapiClient);
}

async function intializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "",
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    loginButton.style.visibility = "visible";
    loginButton.addEventListener("click", handleAuthClick);

    const events = ["drop", "dragenter", "dragleave", "dragover"];
    events.forEach((event) =>
      document.addEventListener(event, (e) => e.preventDefault())
    );

    DargAndDropElement.addEventListener("drop", fileDragged);
  }
}

function fileDragged(e) {
  e.stopPropagation();
  e.preventDefault();

  allFiles.push(...e.dataTransfer.files);
  allFiles.sort((a, b) => a.name.localeCompare(b.name));

  updateFilesView();
}

function updateFilesView() {
  const filesContainer = document.querySelector(".drop-zone .files");
  filesContainer.innerHTML = "";

  if (allFiles.length > 0) {
    document.querySelector(".drop-zone .message").style.visibility = "hidden";
  } else {
    document.querySelector(".drop-zone .message").style.visibility = "visible";
  }

  allFiles.forEach((file) => {
    filesContainer.innerHTML += `<div class="file-item">
    <div class="file-item-image"><i class="fa-solid fa-file"></i></div>
    <div class="file-item-name">${file.name}</div>
    </div>`;
  });
}

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }

    loginButton.removeEventListener("click", handleAuthClick);
    loginButton.textContent = "Cerrar sesión Google";
    loginButton.addEventListener("click", handleSignoutClick);

    uploadFilesButton.addEventListener("click", uploadFiles);
    uploadFilesButton.removeAttribute("disabled");
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

function handleSignoutClick() {
  const token = gapi.client.getToken();
  if (token !== null) {
    google.accounts.oauth2.revoke(token.access_token);
    window.location.reload();
  }
}

function uploadFiles() {
  allFiles.forEach((file) => {
    const fr = new FileReader();
    fr.readAsArrayBuffer(file);
    fr.onload = (f) => {
      const fileMetadata = {
        name: file.name,
      };
      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(fileMetadata)], {
          type: "application/json",
        })
      );
      form.append(
        "file",
        new Blob([new Uint8Array(f.target.result)], { type: file.type })
      );
      fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: new Headers({
            Authorization: "Bearer " + gapi.auth.getToken().access_token,
          }),
          body: form,
        }
      ).then((res) => res.json());
    };
  });
}
