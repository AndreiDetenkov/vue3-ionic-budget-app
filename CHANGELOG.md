# Changelog


## v0.1.3

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.1.2...v0.1.3)

### 💅 Refactors

- Move TabsPage.vue out of core folder and update router path ([597d94d](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/597d94d))
- Re-enable AppRefresher and improve refresh functionality ([79f6711](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/79f6711))
- Update date format and adjust font size in TotalAmount component ([9ceb015](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9ceb015))
- Reorganize supabase config structure and create reusable env utility ([0e8ea0a](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/0e8ea0a))
- Extract database types into separate file and update supabase client setup ([9eece9a](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9eece9a))
- Switch dayjs locale from Russian to English in dates utility ([2f9be89](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/2f9be89))
- Update supabase imports structure and improve TotalAmount date label formatting ([6f0564d](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/6f0564d))
- Update categories types and supabase imports for improved clarity and consistency ([e2b3fd7](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/e2b3fd7))
- Rename Supabase API key env variable for consistency ([eb80141](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/eb80141))
- Update transaction store and related types for improved type safety and consistency ([fcd98be](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fcd98be))
- Streamline transaction store and update date utilities for improved month-based filtering and type safety ([97fa11a](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/97fa11a))
- Update Transaction type to omit unused fields for improved type clarity ([7261c08](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7261c08))
- Enhance TransactionList with "See All" button and introduce modal for displaying full transactions list ([fb1ceb3](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fb1ceb3))
- Extract transaction mapping logic to utility function and clean up unused code in TransactionsPage ([61beeb1](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/61beeb1))
- Add AllTransactionsModal component, improve transaction listing by date, and enhance modal integration ([ba01e04](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/ba01e04))
- Enhance transaction modals and lists with improved UI/UX and streamlined date formatting ([c2fe509](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c2fe509))
- Update transaction modals and lists with consistent toolbar styles and improved UI elements ([a861fe5](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a861fe5))
- Enhance AllTransactionsModal and TransactionList with improved layout and event handling ([c512591](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c512591))
- Enhance type safety for category icons in form and report store ([3a6cba2](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/3a6cba2))
- Migrate ESLint config to TypeScript and update dependencies for improved maintainability ([b6af713](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b6af713))
- Add keys to transactions loop, remove unused code, and clean up category API imports ([7751b98](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7751b98))

### 🏡 Chore

- Update dependencies in package.json and pnpm-lock.yaml ([b30fea5](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b30fea5))
- Add @ionic/core dependency and update lock file ([5934ba7](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/5934ba7))
- Add @tanstack/vue-query dependency and update pnpm-lock.yaml ([2da1f10](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/2da1f10))
- Integrate vue-query plugin and configure eslint for @tanstack/query ([b2fff24](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b2fff24))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>

## v0.1.2

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.1.1...v0.1.2)

### 🚀 Enhancements

- Display category report with icons ([d13d3ff](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/d13d3ff))
- List of transactions in separate categories ([c2ae575](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c2ae575))

### 💅 Refactors

- Update module's path ([f91ac39](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/f91ac39))

### 🏡 Chore

- Update dependencies ([b4e92bc](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b4e92bc))
- Disable ionic refresher ([d8495bf](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/d8495bf))
- Package.json scripts update ([3d3cad1](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/3d3cad1))
- Update node/pnpm version ([eec4c4f](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/eec4c4f))
- Update dependencies ([5e73f03](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/5e73f03))
- Update dependencies in package.json and pnpm-lock.yaml ([4a2d643](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/4a2d643))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>
- AndreiDetenkov <a.detenkov@gmail.com>

## v0.1.1

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.1.0...v0.1.1)

### 🚀 Enhancements

- Display list of categories with total amounts ([f500bc4](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/f500bc4))

### 🩹 Fixes

- Import path fixes ([40bbf58](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/40bbf58))
- Import path fixes ([0e27375](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/0e27375))

### 💅 Refactors

- Report by categories ([f644ab7](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/f644ab7))
- Add alias for reports module ([8e7960f](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/8e7960f))
- Add public api index files ([d717305](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/d717305))
- Move types into types.ts, add aliases for modules path ([92d1ff6](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/92d1ff6))

### 🏡 Chore

- Update gradle in android studio ([433301b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/433301b))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>

## v0.1.0

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.0.6...v0.1.0)

### 🚀 Enhancements

- ⚠️  New modular system ([bda1a54](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/bda1a54))

### 💅 Refactors

- Reorganize structure ([18bf4e8](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/18bf4e8))
- Remove cypress and e2e tests ([8a71a38](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/8a71a38))
- Implement core folder ([862ae70](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/862ae70))
- Implement transactions module ([c91ae19](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c91ae19))
- Update path of transactions module ([a84fad3](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a84fad3))
- Move features into the transactions module ([1a4eb32](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/1a4eb32))
- Updates in supabase config ([0815d84](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/0815d84))
- Implement categories module ([2ebf0bd](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/2ebf0bd))
- Implement reports module ([7b2dea2](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7b2dea2))

### 🏡 Chore

- Update libs ([c95e226](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c95e226))
- Update dependencies ([df65de6](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/df65de6))

#### ⚠️ Breaking Changes

- ⚠️  New modular system ([bda1a54](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/bda1a54))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>

## v0.0.6

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.0.5...v0.0.6)

### 🚀 Enhancements

- Create update transaction action / api ([6e9c4cf](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/6e9c4cf))
- Add updating transaction modal ([5d462e9](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/5d462e9))
- Updating transaction items ([2f07aa8](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/2f07aa8))
- Update transaction ([279d199](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/279d199))

### 💅 Refactors

- Move slider item to feature and rename ([1b8e425](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/1b8e425))
- Slide item methods refactoring ([3032c2c](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/3032c2c))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>

## v0.0.5

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.0.4...v0.0.5)

### 🩹 Fixes

- Remove deprecated meta tag ([9950b12](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9950b12))
- Fetch categories if it aren't in storage ([6f63c8b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/6f63c8b))

### 💅 Refactors

- Small improvements ([f1ecf68](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/f1ecf68))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>

## v0.0.4

[compare changes](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/compare/v0.0.3...v0.0.4)

### 🚀 Enhancements

- Save categories into storage ([fbc602a](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fbc602a))
- Calculate value of transactions by category ([d0cc734](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/d0cc734))

### 💅 Refactors

- Change tabs order ([ef55f81](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/ef55f81))
- Rename tabs to AppTabs and move to shared ([026d4d6](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/026d4d6))
- Naming updates ([c8c42bc](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c8c42bc))

### 🏡 Chore

- Update libs version ([914153b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/914153b))
- Upgrade Gradle plugin version ([cbac397](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/cbac397))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>

## v0.0.3


### 🚀 Enhancements

- Implement get transactions api, define useTransactionStore ([accdf5a](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/accdf5a))
- Render list (last 10) of transactions ([6000b46](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/6000b46))
- Update tabs ([74d70a7](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/74d70a7))
- Update tabs ([50afbee](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/50afbee))
- Implement add new transaction ([f62fecb](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/f62fecb))
- Reformat code ([9cb13d7](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9cb13d7))
- Styling transaction list items ([fa7bcc4](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fa7bcc4))
- Implement total amount block ([6712d4d](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/6712d4d))
- Implement inputs for add transaction form ([0d5432d](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/0d5432d))
- Get Categories from server side ans save them in store ([fd259f9](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fd259f9))
- Display categories cards list ([7be6701](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7be6701))
- Implement add new transaction functionality ([c147c3e](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c147c3e))
- Implement add new transaction functionality ([1730b1d](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/1730b1d))
- Implement development for ios ([ee17646](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/ee17646))
- Select all from categories ([d9cec12](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/d9cec12))
- Refactoring create and display transactions ([9687c5e](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9687c5e))
- Update add transaction feature public api ([b2c0ed8](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b2c0ed8))
- Update styles ([23a2530](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/23a2530))
- Implement refresher functionality ([8c084f3](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/8c084f3))
- Small update structure ([b0e22ce](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b0e22ce))
- Add segments component ([7149e8b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7149e8b))
- Implement range transaction requests ([e76c72c](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/e76c72c))
- Remove title from amount card ([7180175](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7180175))
- Fix eslint errors ([fa84688](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fa84688))
- Update supabase request filters ([4df0c88](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/4df0c88))
- Small updates ([9b30c0a](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9b30c0a))
- Implement app toast component, caegories form component ([e958455](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/e958455))
- Implement list item slide component ([7b24ce7](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7b24ce7))
- Implement removing transaction ([9d4d9eb](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/9d4d9eb))
- Save transaction filter unit in store, get transactions by unit range ([e87aa04](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/e87aa04))
- Add alert before removing ([5dcde1f](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/5dcde1f))

### 💅 Refactors

- Update tabs navigation ([ddec2e1](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/ddec2e1))
- Update supabase create client, add env variables checker ([024e383](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/024e383))
- Update dates service ([a5628de](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a5628de))
- Move category list into add transaction feature ([af537ea](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/af537ea))
- Update creating functionality ([ea710c1](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/ea710c1))
- Rename views, small updates ([431ae3d](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/431ae3d))
- Divide refresh view component ([c95b840](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c95b840))
- Divide transaction list item from transaction list ([a7f0c95](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a7f0c95))
- Add transaction empty component ([8309047](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/8309047))
- Divide transaction tabs into component ([a223c87](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a223c87))
- Styling and clear code ([4b0b06c](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/4b0b06c))
- Add transaction form restructure ([6a69947](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/6a69947))
- Update getTransactionsByRange functionality ([dc678cc](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/dc678cc))

### 🏡 Chore

- Install supabase-js dependency and supabase types ([669b7a4](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/669b7a4))
- Reinstall all dependencies with pnpm ([3512466](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/3512466))
- Install dayjs library, create methods for work with dates ([7a11513](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7a11513))
- Add public api for supabase ([c54c450](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/c54c450))
- Add nvmrc file for node version manager ([7a51076](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/7a51076))
- Reorganaze structure ([2af7d4c](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/2af7d4c))
- Small updates ([8beae7f](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/8beae7f))
- Add sync script for ionic and prettier config ([16dd14e](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/16dd14e))
- Update cpacitor config ([99a5c93](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/99a5c93))
- Define supabase types ([82fb938](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/82fb938))
- Install pinia, update packages ([786cd1b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/786cd1b))
- Update server url, app-name in capacitor config ([14ff4e6](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/14ff4e6))
- Hide styles for dark theme ([5e6db3c](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/5e6db3c))
- Pnpm update vite ([a55368b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a55368b))
- Install node types ([62a83f0](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/62a83f0))
- Add android ([5ab660b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/5ab660b))
- Add android app files into git ([ca697d5](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/ca697d5))
- Upgrade dependencies ([0955cb6](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/0955cb6))
- Add devtools, display pinia in devtools ([4cd7149](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/4cd7149))
- Small updates ([a2c8557](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/a2c8557))
- Add capacitor android ([24e7c71](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/24e7c71))
- Update node and dependencies ([fd30e13](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/fd30e13))
- Generate android and ios App files ([e093008](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/e093008))
- Ios App files ([b8a7ab9](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/b8a7ab9))
- Creating app release ([0094a1e](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/0094a1e))
- Update .gitignore ([dd6181b](https://github.com/AndreiDetenkov/vue3-ionic-budget-app/commit/dd6181b))

### ❤️ Contributors

- Andrei.detenkov <a.detenkov@gmail.com>
- AndreiDetenkov ([@AndreiDetenkov](http://github.com/AndreiDetenkov))

