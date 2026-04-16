# 🤖 Android — Guía Completa de Setup
## Desde cero hasta Google Play Store

---

## Paso 1: Agregar google-services.json REAL

⚠️ Este paso es obligatorio antes de hacer prebuild.

```bash
# Descargar desde console.firebase.google.com → tu proyecto → app Android
# Copiar a:
cp ~/Descargas/google-services.json frontend/google-services.json
```

---

## Paso 2: Generar carpeta android/ con Expo Prebuild

```bash
cd frontend
npm install
npx expo prebuild --platform android --clean
```

Esto genera:
- `android/app/build.gradle` (con google-services plugin)
- `android/app/src/main/AndroidManifest.xml` (con todos los permisos)
- `android/app/src/main/java/com/agape/app/MainActivity.kt`
- `android/gradle/wrapper/gradle-wrapper.properties`

---

## Paso 3: Configurar firma para release

```bash
# Generar keystore (guardar en lugar seguro — sin esto no puedes actualizar la app)
keytool -genkey -v -keystore agape-release.keystore \
  -alias agape -keyalg RSA -keysize 2048 -validity 10000

# Copiar el keystore
cp agape-release.keystore frontend/android/app/agape-release.keystore
```

En `frontend/android/app/build.gradle`, configurar:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('agape-release.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "TU_PASSWORD"
            keyAlias 'agape'
            keyPassword System.getenv("KEY_PASSWORD") ?: "TU_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## Paso 4: Build AAB para Play Store

```bash
cd frontend/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

---

## Paso 5: Subir a Google Play Console

1. Play Console → Tu app → Producción → Crear versión
2. Subir `app-release.aab`
3. Completar el formulario de "Seguridad de datos" (ver GOOGLE_PLAY_DATA_SAFETY.md)
4. Configurar clasificación de contenido → Dating → Adult
5. En "Notas del revisor" incluir cuenta de prueba

---

## Checklist Android antes de enviar

- [ ] google-services.json REAL (no el placeholder)
- [ ] Keystore de producción generado y guardado en lugar seguro
- [ ] AAB compilado con gradle bundleRelease
- [ ] Target SDK = 34 (verificar en app.json → expo-build-properties)
- [ ] Data Safety completado en Play Console
- [ ] Clasificación de contenido completada
- [ ] Cuenta de prueba configurada en Play Console

