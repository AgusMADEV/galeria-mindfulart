const albumForm = document.getElementById('album-form');
const albumName = document.getElementById('album-name');
const albumsList = document.getElementById('albums-list');
const message = document.getElementById('message');


// ==========================================
// CARGAR ÁLBUMES
// ==========================================

async function loadAlbums() {

    try {

        const response = await fetch('/api/albums');
        const data = await response.json();

        if (!data.success) {
            albumsList.textContent = 'Error al cargar los álbumes';
            return;
        }

        if (data.albums.length === 0) {

            albumsList.innerHTML = `
                <p>
                    Todavía no tienes ningún álbum.
                </p>
            `;

            return;
        }

        albumsList.innerHTML = '';

        data.albums.forEach(album => {

            const albumElement = document.createElement('div');

            albumElement.classList.add('album');

            albumElement.innerHTML = `
                <div class="album-label">
                    ALBUM
                </div>

                ${
                    album.preview_images.length
                        ? `
                            <div class="album-previews">
                                ${album.preview_images.map(image => `
                                    <div class="album-preview">
                                        <img
                                            src="/uploads/${image}"
                                            alt=""
                                        >
                                    </div>
                                `).join('')}
                            </div>
                        `
                        : ''
                }

                <div class="album-content">

                    <h3 class="album-title">${album.name}</h3>

                    <div class="album-details">

                        <p>
                            Creado ·
                            ${new Date(album.created_at).toLocaleDateString('es-ES')}
                        </p>

                        <p>
                            ${album.file_count}
                            ${album.file_count === 1 ? 'archivo' : 'archivos'}
                        </p>

                        <p class="album-token">
                            ${album.token}
                        </p>

                    </div>

                    <div class="album-actions">

                        <button
                            class="copy-link-button"
                            data-token="${album.token}"
                        >
                            Copiar enlace
                        </button>

                        <button
                            class="view-album-button"
                            data-token="${album.token}"
                        >
                            Ver álbum ↗
                        </button>

                        <button
                            class="edit-album-button"
                            data-id="${album.id}"
                            data-name="${album.name}"
                            aria-label="Editar álbum"
                            title="Editar álbum"
                        >
                            ✎
                        </button>

                    </div>

                </div>
            `;

            albumsList.appendChild(albumElement);

        });

    } catch (error) {

        console.error(error);

        albumsList.textContent =
            'No se ha podido conectar con el servidor';

    }
}


// ==========================================
// CREAR ÁLBUM
// ==========================================

albumForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const name = albumName.value.trim();

    if (!name) {
        return;
    }

    message.textContent = 'Creando álbum...';

    try {

        const response = await fetch('/api/albums', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                name
            })

        });

        const data = await response.json();

        if (!data.success) {

            message.textContent = data.message;

            return;
        }

        message.textContent = 'Álbum creado correctamente';

        albumName.value = '';

        await loadAlbums();

    } catch (error) {

        console.error(error);

        message.textContent =
            'Error al conectar con el servidor';

    }

});


const albumSelect = document.getElementById('album-select');
const fileInput = document.getElementById('file-input');
const uploadButton = document.getElementById('upload-button');
const uploadMessage = document.getElementById('upload-message');
const uploadProgressContainer =
    document.getElementById('upload-progress-container');

const uploadProgressFill =
    document.getElementById('upload-progress-fill');

const uploadProgressText =
    document.getElementById('upload-progress-text');
const selectedFiles = document.getElementById('selected-files');


// ==========================================
// CARGAR ÁLBUMES EN EL SELECT
// ==========================================

async function loadAlbumSelect() {

    try {

        const response = await fetch('/api/albums');
        const data = await response.json();

        if (!data.success) {
            return;
        }

        albumSelect.innerHTML = `
            <option value="">
                Selecciona un álbum
            </option>
        `;

        data.albums.forEach(album => {

            const option = document.createElement('option');

            option.value = album.token;
            option.textContent = album.name;

            albumSelect.appendChild(option);

        });

    } catch (error) {

        console.error(error);

    }

}

// *==========================================*

// *MOSTRAR ARCHIVOS SELECCIONADOS*

// *==========================================*

fileInput.addEventListener('change', () => {

    const files = fileInput.files;

    if (!files.length) {

        selectedFiles.innerHTML = '';

        return;

    }

    selectedFiles.innerHTML = `
        <p class="selected-files-count">
            ${files.length}
            ${files.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
        </p>

        <div class="selected-files-list">

            ${Array.from(files).map(file => `
                <div class="selected-file">
                    <span class="selected-file-name">
                        ${file.name}
                    </span>

                    <span class="selected-file-size">
                        ${formatFileSize(file.size)}
                    </span>
                </div>
            `).join('')}

        </div>
    `;

});

function formatFileSize(bytes) {

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

}

// ==========================================
// SUBIR ARCHIVOS
// ==========================================

uploadButton.addEventListener('click', async () => {

    const token = albumSelect.value;
    const files = fileInput.files;

    if (!token) {

        uploadMessage.textContent =
            'Selecciona un álbum.';

        return;

    }

    if (!files.length) {

        uploadMessage.textContent =
            'Selecciona al menos un archivo.';

        return;

    }

    const formData = new FormData();

    for (const file of files) {

        formData.append('files', file);

    }

    uploadMessage.textContent =
        'Subiendo archivos...';

    uploadButton.disabled = true;

   try {

    uploadProgressContainer.style.display = 'block';

    uploadProgressFill.style.width = '0%';

    uploadProgressText.textContent = '0%';

    const xhr = new XMLHttpRequest();

    xhr.open(
        'POST',
        `/api/albums/${token}/files`
    );

    xhr.upload.addEventListener('progress', (event) => {

        if (!event.lengthComputable) {
            return;
        }

        const percentage =
            Math.round((event.loaded / event.total) * 100);

        uploadProgressFill.style.width =
            `${percentage}%`;

        uploadProgressText.textContent =
            `${percentage}%`;

    });

    xhr.onload = async () => {

        try {

            const data = JSON.parse(xhr.responseText);

            if (xhr.status < 200 || xhr.status >= 300 || !data.success) {

                uploadMessage.textContent =
                    data.message || 'Error al subir los archivos.';

                return;

            }

            uploadProgressFill.style.width = '100%';

            uploadProgressText.textContent =
                '100%';

            uploadMessage.textContent =
                `${data.files.length} archivo(s) subido(s) correctamente.`;

            fileInput.value = '';

            selectedFiles.innerHTML = '';

            await loadAlbums();
            await loadAlbumSelect();

        } catch (error) {

            console.error(error);

            uploadMessage.textContent =
                'Error al procesar la respuesta del servidor.';

        } finally {

            uploadButton.disabled = false;

        }

    };

    xhr.onerror = () => {

        uploadMessage.textContent =
            'Error al subir los archivos.';

        uploadButton.disabled = false;

    };

    xhr.send(formData);

    } catch (error) {

        console.error(error);

        uploadMessage.textContent =
            'Error al subir los archivos.';

        uploadButton.disabled = false;

    }finally {

        uploadButton.disabled = false;

    }

});


// Cargar álbumes también en el selector
loadAlbumSelect();

// ==========================================
// INICIALIZAR
// ==========================================

loadAlbums();

document.addEventListener('click', async (event) => {

    const viewButton =
        event.target.closest('.view-album-button');

    if (viewButton) {

        const token =
            viewButton.dataset.token;

        const link =
            `${window.location.origin}/a/${token}`;

        window.open(link, '_blank');

        return;
    }

    const editButton =
    event.target.closest('.edit-album-button');

    if (editButton) {

        const album =
            editButton.closest('.album');

        const title =
            album.querySelector('.album-title');

        const originalName =
            title.textContent.trim();

        const editContainer =
            document.createElement('div');

        editContainer.className =
            'album-edit';

        editContainer.innerHTML = `
            <span class="album-edit-label">
                EDITAR NOMBRE
            </span>

            <input
                type="text"
                class="edit-album-input"
                value="${originalName}"
            >

            <div class="edit-album-actions">

                <button
                    type="button"
                    class="save-album-button"
                >
                    Guardar
                </button>

                <button
                    type="button"
                    class="cancel-album-button"
                >
                    Cancelar
                </button>

            </div>
        `;

        title.replaceWith(editContainer);

        const input =
            editContainer.querySelector('.edit-album-input');

        input.focus();
        input.select();

        return;

    }

    const saveButton =
    event.target.closest('.save-album-button');

    if (saveButton) {

        const album =
            saveButton.closest('.album');

        const editButton =
            album.querySelector('.edit-album-button');

        const albumId =
            editButton.dataset.id;

        const input =
            album.querySelector('.edit-album-input');

        const newName =
            input.value.trim();

        if (!newName) {

            input.focus();

            return;

        }

        saveButton.disabled = true;
        saveButton.textContent = 'Guardando...';

        try {

            const response = await fetch(
                `/api/albums/${albumId}`,
                {
                    method: 'PUT',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        name: newName
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok || !data.success) {

                alert(
                    data.message ||
                    'No se ha podido actualizar el álbum.'
                );

                return;

            }

            await loadAlbums();

        } catch (error) {

            console.error(error);

            alert(
                'Error al actualizar el álbum.'
            );

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = 'Guardar';

        }

        return;

    }

    const cancelButton =
    event.target.closest('.cancel-album-button');

    if (cancelButton) {

        const album =
            cancelButton.closest('.album');

        const editButton =
            album.querySelector('.edit-album-button');

        const originalName =
            editButton.dataset.name;

        await loadAlbums();

        return;

    }

    const copyButton =
        event.target.closest('.copy-link-button');

    if (!copyButton) {
        return;
    }

    const token =
        copyButton.dataset.token;

    const link =
        `${window.location.origin}/a/${token}`;

    try {

        await navigator.clipboard.writeText(link);

        const originalText =
            copyButton.textContent;

        copyButton.textContent =
            '¡Enlace copiado!';

        setTimeout(() => {

            copyButton.textContent =
                originalText;

        }, 1800);

    } catch (error) {

        console.error(error);

        copyButton.textContent =
            'No se pudo copiar';

        setTimeout(() => {

            copyButton.textContent =
                'Copiar enlace';

        }, 1800);

    }

});

document.addEventListener('keydown', (event) => {

    const input =
        event.target.closest('.edit-album-input');

    if (!input) {
        return;
    }

    if (event.key === 'Enter') {

        event.preventDefault();

        const saveButton =
            input.closest('.album')
                .querySelector('.save-album-button');

        saveButton.click();

    }

    if (event.key === 'Escape') {

        event.preventDefault();

        const cancelButton =
            input.closest('.album')
                .querySelector('.cancel-album-button');

        cancelButton.click();

    }

});