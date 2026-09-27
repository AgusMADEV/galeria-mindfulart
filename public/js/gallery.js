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

            const fileUrl =
                `/uploads/${file.stored_name}`;

            // Imagen
            if (file.mime_type.startsWith('image/')) {

                fileElement.innerHTML = `
                    <div class="media-card">

                        <img
                            src="${fileUrl}"
                            alt="${file.original_name}"
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

                        <video
                            controls
                            preload="metadata"
                        >
                            <source
                                src="${fileUrl}"
                                type="${file.mime_type}"
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

        });

    } catch (error) {

        console.error(error);

        albumName.textContent = 'Error';

        albumInfo.textContent =
            'No se ha podido cargar la galería.';

    }

}

loadGallery();