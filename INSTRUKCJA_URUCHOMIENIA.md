## Jak uruchomić aplikację (Tryb Deweloperski)

W tym trybie masz dostęp do "Hot Reload" - zmiany w kodzie są widoczne natychmiast.

1.  Otwórz terminal w folderze projektu.
2.  Wpisz:
    ```bash
    npm run dev
    ```
3.  Uruchomią się dwa procesy:
    *   **Serwer**: `http://localhost:3000`
    *   **Klient**: Okno aplikacji Electron.

## Jak zbudować instalator (Dystrybucja)

Aby stworzyć gotowy plik `.exe` (Windows) lub `.AppImage` (Linux):

1.  Wpisz w terminalu:
    ```bash
    npm run dist
    ```
2.  Gotowe pliki znajdziesz w folderze:
    `packages/client/release/`


### Linux
Stworzyłem plik `Launch_App.sh` w folderze projektu.

1.  Nadaj mu uprawnienia wykonywania:
    ```bash
    chmod +x Launch_App.sh
    ```
2.  Uruchom go:
    ```bash
    ./Launch_App.sh
    ```
