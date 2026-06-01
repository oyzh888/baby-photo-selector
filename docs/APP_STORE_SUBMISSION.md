# App Store Submission Guide — 宝宝精选

## Pre-submission Checklist

### On your Mac (one-time setup)
1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `npx eas login`
3. Configure: `npx eas build:configure`
4. Install CocoaPods: `cd ios && pod install`

### Assets needed (create before build)
- `assets/icon.png` — 1024×1024px, no transparency, no rounded corners
- `assets/splash.png` — 1284×2778px recommended, centered logo on #FFF9FB background

### App Store Connect setup
1. Create new app at https://appstoreconnect.apple.com
2. Fill in:
   - **Name:** 宝宝精选
   - **Bundle ID:** com.babyphotoselector.app
   - **Category:** Photo & Video
   - **Age Rating:** 4+

### App Description (Chinese)
```
自动从相册里找出宝宝最美的瞬间。

扫描最近 1000 张照片，AI 识别宝宝照片并评分，挑出最好看的 30 张，一键保存到「宝宝精选」相册。

✅ 全程本地处理，照片不离开手机
✅ 自动识别清晰度、宝宝概率、曝光和构图
✅ 支持手动删除误判、补充漏选
✅ 一键保存到系统相册
```

### Privacy declaration
- Data not collected from this app
- No third-party analytics
- No advertising networks

### Build & Submit commands
```bash
# Build for App Store
npx eas build --platform ios --profile production

# Submit to App Store
npx eas submit --platform ios --latest
```

## Info.plist permissions (already configured)
- `NSPhotoLibraryUsageDescription` ✅
- `NSPhotoLibraryAddUsageDescription` ✅
- `UIBackgroundModes: fetch, processing` ✅
