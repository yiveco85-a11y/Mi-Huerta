# Mi Huerta — cómo generar el APK

Tenés dos caminos. El primero (GitHub) no requiere instalar nada en tu
computador, solo una cuenta gratuita y el navegador. El segundo requiere
instalar Node.js y Android Studio localmente.

---

## Opción A — Compilar en la nube con GitHub (recomendado, sin instalar nada)

1. Creá una cuenta gratuita en github.com si no tenés una.
2. Creá un repositorio nuevo (botón verde "New"), puede ser privado.
3. Subí **todo el contenido de esta carpeta** (`mi-huerta-apk`, incluida la
   carpeta oculta `.github`) al repositorio. La forma más fácil desde el
   navegador: en la página del repo, "Add file" → "Upload files", y
   arrastrás todos los archivos y carpetas.
4. Andá a la pestaña **Actions** del repositorio. Deberías ver un flujo
   llamado "Build APK". Si no arrancó solo, tocá "Run workflow".
5. Esperá unos minutos a que termine (ícono verde de check).
6. Entrá a esa ejecución terminada y bajá hasta "Artifacts" → descargá
   **mi-huerta-apk** (es un .zip que contiene el app-debug.apk).
7. Pasá ese .apk a tu celular (por USB, WhatsApp, Google Drive, etc.),
   abrilo y aceptá instalar "de origen desconocido" si Android lo pide.

Este método compila el APK en los servidores de GitHub siguiendo
exactamente los mismos pasos que harías en tu computador, así que el
resultado es el mismo .apk real e instalable.

---

## Opción B — Compilar en tu computador con Android Studio

### 1. Instalar lo necesario (una sola vez)
- Node.js LTS (nodejs.org)
- Android Studio (developer.android.com/studio), incluye el SDK

### 2. Instalar dependencias del proyecto
Abrí una terminal dentro de esta carpeta (mi-huerta-apk):
```
npm install
```

### 3. Compilar la app web
```
npm run build
```

### 4. Agregar la plataforma Android
```
npx cap add android
npx cap sync android
```

### 5. Abrir el proyecto en Android Studio
```
npx cap open android
```

### 6. Generar el APK
En Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s).
El archivo queda en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Si más adelante querés publicarla en Google Play
Vas a necesitar generar un AAB firmado con una keystore propia. Es un
paso aparte — avisame si llegás a ese punto y te guío.

## Notas
- Cada vez que cambies el código, repetí el proceso (build -> sync ->
  compilar) o simplemente volvé a subir los cambios a GitHub si usás la
  Opción A: el flujo se vuelve a ejecutar solo.
- Los datos (plantas, riegos, fotos) se guardan en el propio celular con
  localStorage, dentro de la app — no se suben a ningún servidor.
- El ícono y la pantalla de carga por defecto son los de Capacitor; se
  pueden personalizar con npx @capacitor/assets generate.
