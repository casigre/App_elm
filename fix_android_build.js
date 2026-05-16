const fs = require('fs');
const path = require('path');

const androidPath = path.join(__dirname, 'android');
const localPropertiesPath = path.join(androidPath, 'local.properties');
const gradlePropertiesPath = path.join(androidPath, 'gradle.properties');
const buildGradlePath = path.join(androidPath, 'app', 'build.gradle');

// 1. Write local.properties (auto-detect SDK path)
function findSdkPath() {
  if (process.env.ANDROID_HOME) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT) return process.env.ANDROID_SDK_ROOT;
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidate = path.join(localAppData, 'Android', 'Sdk');
  if (fs.existsSync(candidate)) return candidate;
  return candidate;
}
const sdkPath = findSdkPath();
const localPropertiesContent = `sdk.dir=${sdkPath.replace(/\\/g, '/')}\n`;
fs.writeFileSync(localPropertiesPath, localPropertiesContent);
console.log('✓ local.properties configured (sdk=' + sdkPath + ')');

// 2. Update gradle.properties
if (fs.existsSync(gradlePropertiesPath)) {
    let gradleProps = fs.readFileSync(gradlePropertiesPath, 'utf8');
    if (!gradleProps.includes('org.gradle.jvmargs')) {
        gradleProps += '\norg.gradle.jvmargs=-Xmx512m\n';
        fs.writeFileSync(gradlePropertiesPath, gradleProps);
        console.log('✓ gradle.properties updated (memory limit)');
    } else {
        console.log('- gradle.properties already has memory limits');
    }
}

// 3. Update build.gradle for Java 17 compatibility
if (fs.existsSync(buildGradlePath)) {
    let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    
    const java17Config = `
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
`;

    if (!buildGradle.includes('compileOptions')) {
        // Insert inside the android { ... } block
        buildGradle = buildGradle.replace(/android\s*\{/, 'android {' + java17Config);
        fs.writeFileSync(buildGradlePath, buildGradle);
        console.log('✓ build.gradle updated (Java 17 compatibility)');
    } else {
        console.log('- build.gradle already has compileOptions');
    }
}

// 4. Update Cordova Plugins build.gradle
const cordovaPluginsGradlePath = path.join(androidPath, 'capacitor-cordova-android-plugins', 'build.gradle');
if (fs.existsSync(cordovaPluginsGradlePath)) {
    let content = fs.readFileSync(cordovaPluginsGradlePath, 'utf8');
    if (content.includes('JavaVersion.VERSION_21')) {
        content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
        fs.writeFileSync(cordovaPluginsGradlePath, content);
        console.log('✓ cordova-plugins build.gradle updated (Java 17)');
    }
}

// 5. Update app/capacitor.build.gradle
const appCapacitorGradlePath = path.join(androidPath, 'app', 'capacitor.build.gradle');
if (fs.existsSync(appCapacitorGradlePath)) {
    let content = fs.readFileSync(appCapacitorGradlePath, 'utf8');
    if (content.includes('JavaVersion.VERSION_21')) {
        content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
        fs.writeFileSync(appCapacitorGradlePath, content);
        console.log('✓ app/capacitor.build.gradle updated (Java 17)');
    }
}

// 6. Update capacitor-app build.gradle (in node_modules)
const capAppGradlePath = path.join(__dirname, 'node_modules', '@capacitor', 'app', 'android', 'build.gradle');
if (fs.existsSync(capAppGradlePath)) {
    let content = fs.readFileSync(capAppGradlePath, 'utf8');
    if (content.includes('JavaVersion.VERSION_21')) {
        content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
        fs.writeFileSync(capAppGradlePath, content);
        console.log('✓ @capacitor/app build.gradle updated (Java 17)');
    }
}

console.log('Configuration complete!');
