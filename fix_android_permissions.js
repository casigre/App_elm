const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
    console.error('[ERROR] No se encuentra AndroidManifest.xml en: ' + manifestPath);
    process.exit(1);
}

let content = fs.readFileSync(manifestPath, 'utf8');

const permissions = `
    <!-- Bluetooth Classic & Scan Permissions -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
`;

// Check if already added (check for location specifically as it is the most recent addition)
if (content.includes('android.permission.ACCESS_FINE_LOCATION')) {
    console.log('[OK] Los permisos ya están presentes.');
    process.exit(0);
}

// Insert before the last </manifest>
content = content.replace('</manifest>', permissions + '</manifest>');

fs.writeFileSync(manifestPath, content);
console.log('[SUCCESS] Permisos de Bluetooth añadidos a AndroidManifest.xml');
