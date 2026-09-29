const lightbox =
    document.getElementById('lightbox');

const lightboxImage =
    document.getElementById('lightbox-image');

const lightboxClose =
    document.getElementById('lightbox-close');


function openLightbox(imageUrl, imageName) {

    lightboxImage.src = imageUrl;
    lightboxImage.alt = imageName;

    lightbox.classList.add('active');

    document.body.classList.add('lightbox-open');
}


function closeLightbox() {

    lightbox.classList.remove('active');

    document.body.classList.remove('lightbox-open');

    lightboxImage.src = '';
}


lightboxClose.addEventListener(
    'click',
    closeLightbox
);


lightbox.addEventListener(
    'click',
    (event) => {

        if (event.target === lightbox) {
            closeLightbox();
        }

    }
);


document.addEventListener(
    'keydown',
    (event) => {

        if (event.key === 'Escape') {
            closeLightbox();
        }

    }
);

const selectedCount =
    document.getElementById('selected-count');

const selectAllButton =
    document.getElementById('select-all-button');

const downloadSelectedButton =
    document.getElementById('download-selected-button');

const downloadAllButton =
document.getElementById('download-all-button');

function updateSelection() {

    const checkboxes =
        document.querySelectorAll('.file-checkbox');

    const checked =
        document.querySelectorAll('.file-checkbox:checked');

    const total =
        checkboxes.length;

    const selected =
        checked.length;

    selectedCount.textContent = selected;

    downloadSelectedButton.disabled =
        selected === 0;

    if (total > 0 && selected === total) {

        selectAllButton.textContent =
            'Deseleccionar todo';

    } else {

        selectAllButton.textContent =
            'Seleccionar todo';

    }

}

async function loadGallery() {

    const albumName = document.getElementById('album-name');
    const albumInfo = document.getElementById('album-info');
    const gallery = document.getElementById('gallery');

    // Obtener token desde la URL
    const pathParts = window.location.pathname.split('/');
    const token = pathParts[2];

    if (!token) {

        albumName.textContent = 'Álbum no encontrado';

        return;

    }

    try {

        const response = await fetch(`/api/albums/${token}`);

        const data = await response.json();

        if (!data.success) {

            albumName.textContent = 'Álbum no encontrado';

            albumInfo.textContent =
                data.message || '';

            gallery.innerHTML = '';

            return;

        }

        const album = data.album;

        albumName.textContent = album.name;

        albumInfo.textContent =
            `${album.files.length} archivo(s)`;

        // Si no hay archivos
        if (album.files.length === 0) {

            gallery.innerHTML = `
                <div class="empty-gallery">
                    <p>
                        Este álbum todavía no tiene archivos.
                    </p>
                </div>
            `;

            return;

        }

        // Limpiar galería
        gallery.innerHTML = '';

        // Mostrar archivos
        album.files.forEach(file => {

            const fileElement =
                document.createElement('div');

            fileElement.classList.add('file-item');

            fileElement.dataset.fileId = file.id;

            const fileUrl =
                `/uploads/${file.stored_name}`;

            const previewUrl =
                file.preview_name
                    ? `/uploads/${file.preview_name}`
                    : fileUrl;

            // Imagen
            if (file.mime_type.startsWith('image/')) {

                fileElement.innerHTML = `
                    <div class="media-card">

                        <label class="file-select">
                            <input
                                type="checkbox"
                                class="file-checkbox"
                                data-file-id="${file.id}"
                            >
                            <span></span>
                        </label>

                        <img
                            src="${fileUrl}"
                            alt="${file.original_name}"
                            class="gallery-image"
                        >

                        <div class="file-info">

                            <span>
                                ${file.original_name}
                            </span>

                            <a
                                href="${fileUrl}"
                                download="${file.original_name}"
                            >
                                Descargar
                            </a>

                        </div>

                    </div>
                `;

            }

            // Vídeo
            else if (file.mime_type.startsWith('video/')) {

                fileElement.innerHTML = `
                    <div class="media-card">

                        <label class="file-select">
                            <input
                                type="checkbox"
                                class="file-checkbox"
                                data-file-id="${file.id}"
                            >
                            <span></span>
                        </label>

                        <video
                            controls
                            preload="metadata"
                        >
                            <source
                                src="${previewUrl}"
                                type="video/mp4"
                            >
                        </video>

                        <div class="file-info">

                            <span>
                                ${file.original_name}
                            </span>

                            <a
                                href="${fileUrl}"
                                download="${file.original_name}"
                            >
                                Descargar
                            </a>

                        </div>

                    </div>
                `;

            }

            gallery.appendChild(fileElement);
            
            const image =
                fileElement.querySelector('.gallery-image');

            if (image) {

                image.addEventListener(
                    'click',
                    () => {

                        openLightbox(
                            fileUrl,
                            file.original_name
                        );

                    }
                );

            }

            const checkbox =
                fileElement.querySelector('.file-checkbox');

            checkbox.addEventListener(
                'change',
                updateSelection
            );

        });

    } catch (error) {

        console.error(error);

        albumName.textContent = 'Error';

        albumInfo.textContent =
            'No se ha podido cargar la galería.';

    }

}

loadGallery();

selectAllButton.addEventListener('click', () => {

    const checkboxes =
        document.querySelectorAll('.file-checkbox');

    const allSelected =
        document.querySelectorAll(
            '.file-checkbox:checked'
        ).length === checkboxes.length;

    checkboxes.forEach(checkbox => {
        checkbox.checked = !allSelected;
    });

    updateSelection();

});

async function downloadFiles(fileIds, button) {

    if (fileIds.length === 0) {
        return;
    }

    const pathParts =
        window.location.pathname.split('/');

    const token = pathParts[2];

    button.disabled = true;

    const originalText =
        button.textContent;

    button.textContent =
        'Preparando ZIP...';

    try {

        const response = await fetch(
            `/api/albums/${token}/download`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    fileIds
                })
            }
        );

        if (!response.ok) {

            const data =
                await response.json();

            throw new Error(
                data.message ||
                'No se ha podido crear el ZIP'
            );

        }

        const blob =
            await response.blob();

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement('a');

        link.href = url;

        const contentDisposition =
            response.headers.get('Content-Disposition');

        let fileName =
            'galeria-mindful-art.zip';

        if (contentDisposition) {

            const utf8Match =
                contentDisposition.match(
                    /filename\*=UTF-8''([^;]+)/i
                );

            const normalMatch =
                contentDisposition.match(
                    /filename="?([^"]+)"?/i
                );

            if (utf8Match && utf8Match[1]) {

                fileName =
                    decodeURIComponent(utf8Match[1]);

            } else if (normalMatch && normalMatch[1]) {

                fileName =
                    normalMatch[1];

            }

        }

        link.download = fileName;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(error);

        alert(
            error.message ||
            'No se ha podido descargar el ZIP'
        );

    } finally {

        button.disabled = false;

        button.textContent =
            originalText;

    }

}

downloadSelectedButton.addEventListener(
    'click',
    async () => {

        const selected =
            document.querySelectorAll(
                '.file-checkbox:checked'
            );

        const fileIds =
            Array.from(selected).map(
                checkbox =>
                    Number(checkbox.dataset.fileId)
            );

        await downloadFiles(
            fileIds,
            downloadSelectedButton
        );

    }
);

downloadAllButton.addEventListener(
    'click',
    async () => {

        const checkboxes =
            document.querySelectorAll(
                '.file-checkbox'
            );

        const fileIds =
            Array.from(checkboxes).map(
                checkbox =>
                    Number(checkbox.dataset.fileId)
            );

        await downloadFiles(
            fileIds,
            downloadAllButton
        );

    }
);