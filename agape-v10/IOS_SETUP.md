# 🍎 iOS — Guía Completa de Setup
## Desde cero hasta App Store

---

## Paso 1: Generar carpeta ios/ con Expo Prebuild

```bash
cd frontend
npm install
npx expo prebuild --platform ios --clean
```

Esto genera automáticamente:
- `ios/Agape.xcworkspace`
- `ios/Agape/AppDelegate.mm`
- `ios/Agape/Info.plist` (con todos los permisos de app.json)
- `ios/Podfile`

---

## Paso 2: Copiar PrivacyInfo.xcprivacy (OBLIGATORIO desde mayo 2024)

```bash
cp frontend/ios-templates/PrivacyInfo.xcprivacy frontend/ios/Agape/PrivacyInfo.xcprivacy
```

Luego en Xcode:
1. Abrir `ios/Agape.xcworkspace`
2. File → Add Files to "Agape"
3. Seleccionar `PrivacyInfo.xcprivacy`
4. Asegurarse de que "Target: Agape" esté marcado ✓

---

## Paso 3: Instalar pods

```bash
cd frontend/ios
pod install
cd ..
```

---

## Paso 4: Configurar en Xcode

1. Abrir `ios/Agape.xcworkspace` (no el .xcodeproj)
2. Seleccionar el target "Agape"
3. **Signing & Capabilities:**
   - Team: seleccionar tu Apple Developer Team
   - Bundle Identifier: `com.agape.app`
   - Activar capability: **In-App Purchase**
   - Activar capability: **Push Notifications**
4. **Info.plist:** verificar que las NSUsageDescription estén en español

---

## Paso 5: Agregar GoogleService-Info.plist

1. Descargar desde Firebase Console → tu proyecto → app iOS
2. Copiar a `ios/Agape/GoogleService-Info.plist`
3. En Xcode → drag-and-drop el archivo al target Agape

---

## Paso 6: Build para App Store

**Opción A — EAS (recomendado, sin Mac requerido):**
```bash
cd frontend
eas build --platform ios --profile production
```

**Opción B — Xcode local (requiere Mac):**
```
Product → Archive → Distribute App → App Store Connect → Upload
```

---

## Checklist iOS antes de enviar

- [ ] Bundle ID `com.agape.app` en Xcode = app.json = App Store Connect
- [ ] Capability "In-App Purchase" activada en Xcode
- [ ] Capability "Push Notifications" activada
- [ ] PrivacyInfo.xcprivacy en el target
- [ ] GoogleService-Info.plist real (no placeholder)
- [ ] APNs Authentication Key en Firebase Console
- [ ] Certificados de distribución válidos
- [ ] App Store Connect: URLs de Privacidad y Términos ingresadas
- [ ] App Store Connect: Acuerdo "Paid Applications" firmado
- [ ] App Store Connect: Clasificación de edad = 17+

