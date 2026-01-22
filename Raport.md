# Raport

## 1. Informacje Podstawowe

**Zespół projektowy:**
- Mateusz Klikuszewski (SRP)
- Hubert Czernicki (AES-256-GCM)
- Tomasz Woś (PBKDF2-HMAC-SHA256)

**Okres realizacji:** Grudzień 2025 - Styczeń 2026

**Status:** Projekt ukończony i funkcjonalny

**Repozytorium:** [Github](https://github.com/cool-moose/Password_Manager)

---

## 2. Harmonogram i Realizacja

### Faza 1: Implementacja Funkcji Kryptograficznych (do 4 grudnia)

#### 2.1. SRP (Secure Remote Password) - Mateusz Klikuszewski

**Zakres odpowiedzialności:**
- Implementacja protokołu SRP-6a zgodnie z RFC 5054
- Obsługa rejestracji i logowania bez przesyłania hasła
- Generowanie kluczy ephemeralnych i weryfikatorów
- Integracja z WASM dla SHA-256


**Realizacja:**
- Plik: `packages/shared/src/srp.ts`
- Wykorzystano grupę MODP 2048-bit

**Kluczowe funkcje zaimplementowane:**
```typescript
- SRPClient.generateRegistration() // Generowanie salt + verifier
- SRPClient.generateEphemeral()    // Klucze publiczne A
- SRPClient.computeSession()       // Obliczanie wspólnego sekretu S
- SRPServer.generateEphemeral()    // Odpowiedź serwera B
- SRPServer.verifySession()        // Weryfikacja dowodu M1
```

**Output:**
- Pełna implementacja protokołu SRP-6a
- Integracja z WASM dla operacji SHA-256
- Testy weryfikacyjne w `packages/shared/src/crypto/verify.ts`

**Wnioski:**
- Wykorzystanie BigInt w JavaScript pozwoliło na operacje na 2048-bitowych liczbach
- WASM znacząco przyspieszyło obliczenia haszujące (SHA-256)
- Protokół działa zgodnie ze standardem RFC 5054

---

#### 2.2. AES-256-GCM - Hubert Czernicki

**Zakres odpowiedzialności:**
- Implementacja szyfru blokowego AES-256 od podstaw
- Tryb GCM (Galois/Counter Mode) dla uwierzytelnionego szyfrowania
- Funkcja GHASH dla integralności danych


**Realizacja:**
- `packages/shared/src/crypto/aes.ts` - Rdzeń AES-256
- `packages/shared/src/crypto/gcm.ts` - Tryb GCM
- `packages/shared/src/crypto/ghash.ts` - Funkcja GHASH

**Kluczowe komponenty:**
```typescript
// AES-256 (14 rund)
- keyExpansion()     // Generowanie kluczy rundowych
- encryptBlock()     // Szyfrowanie pojedynczego bloku
- decryptBlock()     // Deszyfrowanie bloku

// GCM Mode
- encrypt()          // AES-256-GCM encryption
- decrypt()          // AES-256-GCM decryption z weryfikacją tagu
- ghash()            // Obliczanie tagu autentyczności w GF(2^128)
```

**Output:**
- Autorska implementacja AES-256 bez zewnętrznych bibliotek
- Pełna obsługa trybu GCM z tagami uwierzytelniającymi
- Klasa `GF128` dla operacji w ciele Galois
- Suite testów weryfikujących zgodność z NIST SP 800-38D

**Wnioski:**
- Implementacja od zera eliminuje zależności od zewnętrznych bibliotek kryptograficznych
- Testy porównawcze z OpenSSL potwierdziły 100% zgodność
- Constant-time comparison tagów zapobiega timing attacks
- Wydajność: 1MB danych szyfrowanych w ~2290ms (wynik autorskiej implementacji w TypeScript)

---

#### 2.3. PBKDF2-HMAC-SHA256 - Tomasz Woś

**Zakres odpowiedzialności:**
- Derywacja kluczy z hasła głównego
- Implementacja PBKDF2 z 600,000 iteracji
- Implementacja SHA-256 w Rust/WASM dla wydajności

**Realizacja:**
- Funkcja `pbkdf2_hmac_sha256` w module WASM (Rust)
- Integracja w `packages/client/src/client_backend/vault.ts`
- Parametry zgodne z OWASP 2025

**Parametry implementacji:**
```
- Algorytm: HMAC-SHA256
- Iteracje: 600,000
- Długość klucza: 256 bitów (32 bajty)
- Input: Master Password + Secret Key
- Salt: 32 bajty (losowy, unikalny dla użytkownika)
```

**Output:**
- Funkcja derywacji kluczy zintegrowana z WASM
- Klucz AES generowany z hasła głównego + lokalnego sekretu
- Czas derywacji: ~800ms (ochrona przed brute-force)

**Wnioski:**
- 600,000 iteracji zapewnia odporność na ataki GPU
- Wykorzystanie lokalnego Secret Key zwiększa bezpieczeństwo
- WASM zapewnia deterministyczny czas wykonania

---

### Faza 2: Prototyp Aplikacji (do 11 grudnia)

**Odpowiedzialność zespołowa:**

#### 2.4. Architektura Monorepo
- Struktura: `packages/client`, `packages/server`, `packages/shared`
- Build system: Vite + TypeScript
- Workspace management: npm workspaces

#### 2.5. Klient (Electron + React)
- Interfejs użytkownika w React 18
- Integracja z Electron dla Windows/Linux
- Moduł `vault.ts` - zarządzanie zaszyfrowaną bazą
- Operacje: dodawanie, edycja, usuwanie, synchronizacja haseł

#### 2.6. Serwer (Node.js + Express)
- Endpointy: `/register`, `/login/init`, `/login/verify`, `/vault`
- Obsługa SRP po stronie serwera
- Przechowywanie zaszyfrowanych blobów

**Output Fazy 2:**
- Działający prototyp z pełną funkcjonalnością
- Rejestracja i logowanie przez SRP
- Szyfrowanie/deszyfrowanie vaulta lokalnie
- Synchronizacja z serwerem

---

### Faza 3: Finalizacja Aplikacji (do 15 stycznia)

#### 2.7. Dodatkowe Funkcje Zaimplementowane

**Zarządzanie Hasłem Głównym:**
- Zmiana Master Password z re-szyfrowaniem całego vaulta
- Weryfikacja hasła przez zaszyfrowany token

**Import/Export:**
- Export do CSV
- Import z CSV z walidacją

**Synchronizacja:**
- Strategia "Last Write Wins"
- Weryfikacja integralności przy pobieraniu z serwera
- Automatyczna synchronizacja po każdej zmianie

**Bezpieczeństwo:**
- Secret Key przechowywany w `safeStorage` (Electron)
- Verification Token dla walidacji hasła bez deszyfracji
- Constant-time comparison dla tagów GCM

---

## 3. Metryki Projektu

### Testy i Weryfikacja
- NIST SP 800-38D test vectors (AES-GCM)
- 5,000 iteracji fuzzing testów
- Testy granic bloków (0-512 bajtów)
- Testy tamper detection (bit-flipping)
- Porównanie z OpenSSL (100% zgodność)

### Wydajność (wyniki testów)
- Derywacja klucza (PBKDF2, 600k iteracji): ~800ms
- Szyfrowanie 1MB: ~2290ms
- Deszyfrowanie 1MB: ~2288ms
- Inicjalizacja WASM: <100ms

---

## 4. Wnioski Końcowe

### Osiągnięcia
1. **Zero-Knowledge Architecture** - Serwer nigdy nie ma dostępu do haseł
2. **Autorskie implementacje kryptograficzne** - Pełna kontrola nad bezpieczeństwem
3. **Zgodność ze standardami** - RFC 5054 (SRP), NIST SP 800-38D (GCM), OWASP 2025 (PBKDF2)
4. **Wieloplatformowość** - Windows i Linux przez Electron
5. **Wydajność** - Strategiczne wykorzystanie WASM dla najbardziej intensywnych operacji (SHA-256).

### Wyzwania i Rozwiązania
- **Wyzwanie:** Operacje na dużych liczbach (2048-bit) w JavaScript
  - **Rozwiązanie:** BigInt + WASM dla SHA-256
  
- **Wyzwanie:** Implementacja GF(2^128) dla GHASH
  - **Rozwiązanie:** Klasa `GF128` z operacjami na 64-bitowych BigInt

- **Wyzwanie:** Synchronizacja konfliktów
  - **Rozwiązanie:** Last Write Wins z weryfikacją integralności

### Możliwe Rozszerzenia (z planu)
- MFA (Multi-Factor Authentication)
- Uzupełnianie haseł (browser extension)
- Device Binding
- Backup Master Password
- Migracja na SQLite (serwer)
- Vector Clocks dla zaawansowanej synchronizacji
- Implementacja SHA-256 z wykorzystaniem Intel SHA Extensions

---

## 5. Podsumowanie

Projekt Password Manager został zrealizowany zgodnie z założeniami. Zespół skutecznie podzielił odpowiedzialności za komponenty kryptograficzne, co pozwoliło na równoległą pracę i głębokie zrozumienie każdego protokołu.

Kluczowym sukcesem jest autorska implementacja wszystkich algorytmów kryptograficznych, co eliminuje zależności od zewnętrznych bibliotek i zwiększa audytowalność kodu. Chociaż implementacja w czystym TypeScript jest wolniejsza niż rozwiązania natywne (wyciek ~2.3s na 1MB), spełnia ona wymogi projektu dotyczące transparentności i braku zewnętrznych zależności krypto. Wykorzystanie Rust/WASM dla operacji SHA-256 zapewniło niezbędne wsparcie wydajnościowe tam, gdzie było to najbardziej potrzebne. Takie podejście pozwoliło na jak największe zbliżenie się do wydajności funkcji SHA-256 z bibiliotek, bez implementowania jej w Assembly z wykorzystaniem akceleracji sprzętowej (Intel SHA Extensions).

Aplikacja jest w pełni funkcjonalna i gotowa do użycia, spełniając wszystkie założenia architektury Zero-Knowledge.
