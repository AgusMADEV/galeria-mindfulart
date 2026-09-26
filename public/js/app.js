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
                <h3>${album.name}</h3>

                <p>
                    Creado:
                    ${new Date(album.created_at).toLocaleString('es-ES')}
                </p>

                <p>
                    Token:
                    ${album.token}
                </p>
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


// ==========================================
// INICIALIZAR
// ==========================================

loadAlbums();