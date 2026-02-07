// Enhanced FitTrack PWA Application
class FitTrackPWA {
    constructor() {
        this.init();
    }

    async init() {
        // Initialize components
        this.initDatabase();
        this.initUI();
        this.initEventListeners();
        this.initOfflineDetection();
        this.initBackgroundSync();
        this.initPushNotifications();
        
        // Load initial data
        await this.loadInitialData();
        
        // Update UI
        this.updateUI();
        
        // Handle initial route
        this.handleRoute();
    }

    // ========== DATABASE MANAGEMENT ==========
    initDatabase() {
        this.db = null;
        this.DB_NAME = 'FitTrackDB';
        this.DB_VERSION = 3;
        
        // Food database schema
        this.foodSchema = {
            foods: '++id, name, category, calories, protein, carbs, fat, serving, notes, createdAt, updatedAt',
            customFoods: '++id, name, category, calories, protein, carbs, fat, serving, notes, userId, createdAt'
        };
        
        // Logs schema
        this.logsSchema = {
            foodLogs: '++id, foodId, name, calories, protein, carbs, fat, mealType, servings, date, time, notes, synced',
            exerciseLogs: '++id, type, duration, calories, notes, date, time, synced',
            waterLogs: '++id, amount, date, time, synced',
            weightLogs: '++id, weight, date, time, notes, synced'
        };
        
        // User data schema
        this.userSchema = {
            profile: 'id, height, weight, age, gender, activityLevel, createdAt, updatedAt',
            goals: 'id, calories, protein, water, exercise, weight, updatedAt',
            settings: 'id, theme, notifications, reminders, syncEnabled'
        };
        
        // Offline queue
        this.syncQueueSchema = {
            syncQueue: '++id, type, data, retries, createdAt'
        };
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('foods')) {
                    db.createObjectStore('foods', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('foodLogs')) {
                    db.createObjectStore('foodLogs', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('exerciseLogs')) {
                    db.createObjectStore('exerciseLogs', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('waterLogs')) {
                    db.createObjectStore('waterLogs', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('weightLogs')) {
                    db.createObjectStore('weightLogs', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('profile')) {
                    db.createObjectStore('profile', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('goals')) {
                    db.createObjectStore('goals', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('syncQueue')) {
                    db.createObjectStore('syncQueue', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // ========== UI MANAGEMENT ==========
    initUI() {
        this.currentTab = 'dashboard';
        this.currentDate = new Date();
        this.isOnline = navigator.onLine;
        
        // DOM Elements
        this.elements = {
            menuToggle: document.getElementById('menu-toggle'),
            sideNav: document.getElementById('side-nav'),
            closeNav: document.getElementById('close-nav'),
            tabContent: document.getElementById('tab-content'),
            bottomNav: document.querySelectorAll('.nav-btn'),
            quickAddBtn: document.getElementById('quick-add-btn'),
            quickAddModal: document.getElementById('quick-add-modal'),
            closeQuickModal: document.getElementById('close-quick-modal'),
            quickFormContainer: document.getElementById('quick-form-container'),
            syncBtn: document.getElementById('sync-btn'),
            offlineIndicator: document.getElementById('offline-indicator'),
            prevDayBtn: document.getElementById('prev-day'),
            nextDayBtn: document.getElementById('next-day'),
            currentDateEl: document.getElementById('current-date'),
            toast: document.getElementById('toast'),
            installPrompt: document.getElementById('install-prompt'),
            installBtn: document.getElementById('install-btn'),
            cancelInstall: document.getElementById('cancel-install')
        };
        
        // Templates
        this.templates = {
            dashboard: this.createDashboardTemplate(),
            foodLogger: this.createFoodLoggerTemplate(),
            foodDatabase: this.createFoodDatabaseTemplate(),
            exercise: this.createExerciseTemplate(),
            progress: this.createProgressTemplate(),
            healthReport: this.createHealthReportTemplate(),
            profile: this.createProfileTemplate(),
            settings: this.createSettingsTemplate()
        };
    }

    initEventListeners() {
        // Navigation
        this.elements.menuToggle.addEventListener('click', () => this.toggleSideNav());
        this.elements.closeNav.addEventListener('click', () => this.toggleSideNav(false));
        
        // Bottom navigation
        this.elements.bottomNav.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                if (tab) this.switchTab(tab);
            });
        });
        
        // Side navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
                this.toggleSideNav(false);
            });
        });
        
        // Quick add
        this.elements.quickAddBtn.addEventListener('click', () => this.openQuickAddModal());
        this.elements.closeQuickModal.addEventListener('click', () => this.closeQuickAddModal());
        
        document.querySelectorAll('.quick-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.showQuickForm(type);
            });
        });
        
        // Date navigation
        this.elements.prevDayBtn.addEventListener('click', () => this.changeDate(-1));
        this.elements.nextDayBtn.addEventListener('click', () => this.changeDate(1));
        
        // Sync button
        this.elements.syncBtn.addEventListener('click', () => this.syncData());
        
        // Install prompt
        this.elements.installBtn?.addEventListener('click', () => this.installApp());
        this.elements.cancelInstall?.addEventListener('click', () => {
            this.elements.installPrompt.style.display = 'none';
        });
        
        // Swipe gestures
        this.initSwipeGestures();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Handle back button
        window.addEventListener('popstate', () => this.handleRoute());
    }

    initSwipeGestures() {
        let startX, startY, distX, distY;
        const threshold = 50;
        const restraint = 100;
        const allowedTime = 300;
        let startTime;
        
        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startX = touch.pageX;
            startY = touch.pageY;
            startTime = Date.now();
        }, false);
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            distX = touch.pageX - startX;
            distY = touch.pageY - startY;
            const elapsedTime = Date.now() - startTime;
            
            if (elapsedTime <= allowedTime) {
                if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
                    const tabs = ['dashboard', 'logger', 'exercise', 'progress', 'report', 'profile'];
                    const currentIndex = tabs.indexOf(this.currentTab);
                    
                    if (distX > 0 && currentIndex > 0) {
                        // Swipe right - previous tab
                        this.switchTab(tabs[currentIndex - 1]);
                    } else if (distX < 0 && currentIndex < tabs.length - 1) {
                        // Swipe left - next tab
                        this.switchTab(tabs[currentIndex + 1]);
                    }
                }
            }
        }, false);
    }

    // ========== OFFLINE & SYNC MANAGEMENT ==========
    initOfflineDetection() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.elements.offlineIndicator.style.display = 'none';
            this.showToast('Back online! Syncing data...', 'success');
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.elements.offlineIndicator.style.display = 'flex';
            this.showToast('You are offline. Changes will be saved locally.', 'warning');
        });
    }

    initBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-logs').catch(err => {
                    console.log('Background sync registration failed:', err);
                });
            });
        }
    }

    initPushNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.subscribeToPush();
                }
            });
        }
    }

    async subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY')
            });
            
            // Send subscription to server
            await this.savePushSubscription(subscription);
        } catch (error) {
            console.log('Push subscription failed:', error);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // ========== DATA MANAGEMENT ==========
    async loadInitialData() {
        try {
            // Open database
            await this.openDatabase();
            
            // Load default foods if empty
            const foodCount = await this.getFoodCount();
            if (foodCount === 0) {
                await this.loadDefaultFoods();
            }
            
            // Load user profile
            this.profile = await this.getProfile() || this.getDefaultProfile();
            
            // Load goals
            this.goals = await this.getGoals() || this.getDefaultGoals();
            
            // Load today's logs
            await this.loadTodayLogs();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load data. Please refresh.', 'error');
        }
    }

    getDefaultProfile() {
        return {
            id: 1,
            height: 175,
            weight: 68,
            age: 30,
            gender: 'male',
            activityLevel: 'moderate',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    getDefaultGoals() {
        return {
            id: 1,
            calories: 2000,
            protein: 150,
            water: 8,
            exercise: 30,
            weight: 65,
            updatedAt: new Date().toISOString()
        };
    }

    async loadDefaultFoods() {
        const defaultFoods = [
            // ... (same food database as before)
        ];
        
        for (const food of defaultFoods) {
            await this.saveFood(food);
        }
    }

    // ========== CORE FUNCTIONALITY ==========
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tab);
        });
        
        // Load template
        this.elements.tabContent.innerHTML = this.templates[tab] || '<div class="empty-state">Tab not found</div>';
        
        // Initialize tab-specific functionality
        this.initTabFunctionality(tab);
        
        // Update URL
        history.pushState({ tab }, '', `?tab=${tab}`);
        
        // Scroll to top
        window.scrollTo(0, 0);
    }

    initTabFunctionality(tab) {
        switch (tab) {
            case 'dashboard':
                this.initDashboard();
                break;
            case 'logger':
                this.initFoodLogger();
                break;
            case 'database':
                this.initFoodDatabase();
                break;
            case 'exercise':
                this.initExercise();
                break;
            case 'progress':
                this.initProgress();
                break;
            case 'report':
                this.initHealthReport();
                break;
            case 'profile':
                this.initProfile();
                break;
            case 'settings':
                this.initSettings();
                break;
        }
    }

    async loadTodayLogs() {
        const date = this.formatDate(this.currentDate);
        
        this.todayLogs = {
            food: await this.getFoodLogsByDate(date),
            exercise: await this.getExerciseLogsByDate(date),
            water: await this.getWaterLogsByDate(date),
            weight: await this.getWeightLogsByDate(date)
        };
        
        this.calculateTodayTotals();
    }

    calculateTodayTotals() {
        this.todayTotals = {
            calories: this.todayLogs.food.reduce((sum, log) => sum + (log.calories || 0), 0),
            protein: this.todayLogs.food.reduce((sum, log) => sum + (log.protein || 0), 0),
            water: this.todayLogs.water.reduce((sum, log) => sum + (log.amount || 0), 0),
            exercise: this.todayLogs.exercise.reduce((sum, log) => sum + (log.duration || 0), 0),
            weight: this.todayLogs.weight[0]?.weight || this.profile.weight
        };
    }

    // ========== UI UPDATES ==========
    updateUI() {
        // Update date display
        this.elements.currentDateEl.textContent = this.formatDateDisplay(this.currentDate);
        
        // Update navigation stats
        document.getElementById('nav-calories').textContent = this.todayTotals?.calories || 0;
        document.getElementById('nav-water').textContent = this.todayTotals?.water || 0;
        document.getElementById('nav-exercise').textContent = this.todayTotals?.exercise || 0;
        
        // Update user info
        const bmi = this.calculateBMI(this.profile.weight, this.profile.height);
        document.getElementById('user-bmi').textContent = `BMI: ${bmi}`;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    formatDateDisplay(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return `Today, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        } else {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
    }

    // ========== MODAL MANAGEMENT ==========
    toggleSideNav(show) {
        if (show !== undefined) {
            this.elements.sideNav.classList.toggle('active', show);
        } else {
            this.elements.sideNav.classList.toggle('active');
        }
    }

    openQuickAddModal() {
        this.elements.quickAddModal.classList.add('active');
        this.elements.quickFormContainer.innerHTML = '';
    }

    closeQuickAddModal() {
        this.elements.quickAddModal.classList.remove('active');
    }

    closeAllModals() {
        this.elements.quickAddModal.classList.remove('active');
        // Close other modals...
    }

    showQuickForm(type) {
        let formHTML = '';
        
        switch (type) {
            case 'food':
                formHTML = `
                    <div class="quick-food-form">
                        <div class="form-group">
                            <label class="form-label">Food Name</label>
                            <input type="text" class="form-control" id="quick-food-name" placeholder="e.g., Apple">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Calories</label>
                            <input type="number" class="form-control" id="quick-food-calories" placeholder="e.g., 95">
                        </div>
                        <button class="btn btn-primary btn-block" id="save-quick-food">
                            <i class="fas fa-plus"></i> Add Food
                        </button>
                    </div>
                `;
                break;
                
            case 'water':
                formHTML = `
                    <div class="quick-water-form">
                        <div class="form-group">
                            <label class="form-label">Glasses of Water</label>
                            <div class="water-selector">
                                ${[1, 2, 3, 4].map(num => `
                                    <button class="water-option" data-amount="${num}">${num} glass${num > 1 ? 'es' : ''}</button>
                                `).join('')}
                            </div>
                        </div>
                        <button class="btn btn-primary btn-block" id="save-quick-water">
                            <i class="fas fa-tint"></i> Log Water
                        </button>
                    </div>
                `;
                break;
                
            case 'exercise':
                formHTML = `
                    <div class="quick-exercise-form">
                        <div class="form-group">
                            <label class="form-label">Exercise Type</label>
                            <select class="form-control" id="quick-exercise-type">
                                <option value="Walking">Walking</option>
                                <option value="Running">Running</option>
                                <option value="Cycling">Cycling</option>
                                <option value="Weight Training">Weight Training</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Duration (minutes)</label>
                            <input type="number" class="form-control" id="quick-exercise-duration" placeholder="e.g., 30">
                        </div>
                        <button class="btn btn-primary btn-block" id="save-quick-exercise">
                            <i class="fas fa-running"></i> Log Exercise
                        </button>
                    </div>
                `;
                break;
                
            case 'weight':
                formHTML = `
                    <div class="quick-weight-form">
                        <div class="form-group">
                            <label class="form-label">Weight (kg)</label>
                            <input type="number" class="form-control" id="quick-weight-value" 
                                   value="${this.profile.weight}" step="0.1">
                        </div>
                        <button class="btn btn-primary btn-block" id="save-quick-weight">
                            <i class="fas fa-weight"></i> Update Weight
                        </button>
                    </div>
                `;
                break;
        }
        
        this.elements.quickFormContainer.innerHTML = formHTML;
        
        // Add event listeners
        setTimeout(() => {
            switch (type) {
                case 'food':
                    document.getElementById('save-quick-food').addEventListener('click', () => this.saveQuickFood());
                    break;
                case 'water':
                    document.querySelectorAll('.water-option').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            document.querySelectorAll('.water-option').forEach(b => b.classList.remove('active'));
                            e.currentTarget.classList.add('active');
                        });
                    });
                    document.getElementById('save-quick-water').addEventListener('click', () => this.saveQuickWater());
                    break;
                case 'exercise':
                    document.getElementById('save-quick-exercise').addEventListener('click', () => this.saveQuickExercise());
                    break;
                case 'weight':
                    document.getElementById('save-quick-weight').addEventListener('click', () => this.saveQuickWeight());
                    break;
            }
        }, 100);
    }

    // ========== DATA PERSISTENCE ==========
    async saveFood(food) {
        const transaction = this.db.transaction(['foods'], 'readwrite');
        const store = transaction.objectStore('foods');
        
        return new Promise((resolve, reject) => {
            const request = store.put({
                ...food,
                createdAt: food.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getFoodLogsByDate(date) {
        const transaction = this.db.transaction(['foodLogs'], 'readonly');
        const store = transaction.objectStore('foodLogs');
        const index = store.index('date');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(date);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // ========== NOTIFICATIONS ==========
    showToast(message, type = 'success', duration = 3000) {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.className = 'toast';
        toast.classList.add(type, 'show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    scheduleReminders() {
        if (!('Notification' in window)) return;
        
        const now = new Date();
        const reminders = [
            { time: '09:00', message: 'Time for breakfast! 🍳' },
            { time: '12:00', message: 'Lunch time! 🥗' },
            { time: '15:00', message: 'Stay hydrated! 💧' },
            { time: '18:00', message: 'Time for dinner! 🍽️' },
            { time: '21:00', message: 'Log your exercise for today! 🏃‍♂️' }
        ];
        
        reminders.forEach(reminder => {
            const [hours, minutes] = reminder.time.split(':');
            const reminderTime = new Date();
            reminderTime.setHours(hours, minutes, 0, 0);
            
            if (reminderTime > now) {
                const delay = reminderTime.getTime() - now.getTime();
                
                setTimeout(() => {
                    if (Notification.permission === 'granted') {
                        new Notification('FitTrack Reminder', {
                            body: reminder.message,
                            icon: 'icons/icon-192x192.png',
                            badge: 'icons/icon-96x96.png',
                            vibrate: [200, 100, 200]
                        });
                    }
                }, delay);
            }
        });
    }

    // ========== SYNC & BACKUP ==========
    async syncData() {
        if (!this.isOnline) {
            this.showToast('You are offline. Cannot sync.', 'warning');
            return;
        }
        
        this.showToast('Syncing data...', 'info');
        
        try {
            // Sync logs
            await this.syncOfflineLogs();
            
            // Backup data
            await this.createBackup();
            
            this.showToast('Data synced successfully!', 'success');
        } catch (error) {
            console.error('Sync failed:', error);
            this.showToast('Sync failed. Please try again.', 'error');
        }
    }

    async createBackup() {
        const backup = {
            profile: this.profile,
            goals: this.goals,
            logs: this.todayLogs,
            timestamp: new Date().toISOString()
        };
        
        // Save to IndexedDB
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        
        store.put({
            id: Date.now(),
            type: 'backup',
            data: backup,
            createdAt: new Date().toISOString()
        });
        
        // Export as JSON
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        if ('share' in navigator) {
            try {
                await navigator.share({
                    title: `FitTrack Backup ${new Date().toLocaleDateString()}`,
                    files: [new File([dataBlob], `fittrack-backup-${Date.now()}.json`)]
                });
            } catch (err) {
                console.log('Sharing failed:', err);
                this.downloadBackup(dataBlob);
            }
        } else {
            this.downloadBackup(dataBlob);
        }
    }

    downloadBackup(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fittrack-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ========== INSTALLATION ==========
    installApp() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    this.showToast('FitTrack installed successfully!', 'success');
                    this.elements.installPrompt.style.display = 'none';
                }
                this.deferredPrompt = null;
            });
        }
    }

    // ========== TEMPLATES ==========
    createDashboardTemplate() {
        return `
            <div class="dashboard">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-tachometer-alt"></i> Today's Summary
                        </div>
                        <button class="btn btn-sm" id="refresh-dashboard">
                            <i class="fas fa-sync"></i>
                        </button>
                    </div>
                    
                    <div class="dashboard-grid">
                        <div class="summary-card">
                            <div class="summary-value" id="today-calories">0</div>
                            <div class="summary-label">Calories</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" id="today-water">0</div>
                            <div class="summary-label">Water</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" id="today-exercise">0</div>
                            <div class="summary-label">Exercise (min)</div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-value" id="today-protein">0g</div>
                            <div class="summary-label">Protein</div>
                        </div>
                    </div>
                    
                    <div class="progress-container">
                        <div class="progress-header">
                            <span>Calorie Goal</span>
                            <span id="calorie-progress-text">0/2000</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="calorie-progress-bar" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-history"></i> Recent Activity
                        </div>
                        <button class="btn btn-sm" id="view-all-activity">
                            View All
                        </button>
                    </div>
                    <div id="recent-activity-list"></div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-bullseye"></i> Daily Goals
                        </div>
                    </div>
                    <div class="goals-list" id="daily-goals"></div>
                </div>
            </div>
        `;
    }

    // ... (Other template methods would be similar to original but enhanced)

    createFoodLoggerTemplate() {
        return `
            <div class="food-logger">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-utensils"></i> Log Meal
                        </div>
                        <div class="meal-type-selector">
                            <button class="meal-type-btn active" data-meal="breakfast">Breakfast</button>
                            <button class="meal-type-btn" data-meal="lunch">Lunch</button>
                            <button class="meal-type-btn" data-meal="dinner">Dinner</button>
                            <button class="meal-type-btn" data-meal="snack">Snack</button>
                        </div>
                    </div>
                    
                    <div class="food-search-container">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search"></i>
                            <input type="text" id="food-search-input" placeholder="Search foods..." class="form-control">
                            <button class="btn btn-sm" id="scan-barcode">
                                <i class="fas fa-barcode"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="search-results" id="food-search-results"></div>
                    
                    <div class="selected-foods">
                        <div class="selected-header">
                            <h4>Selected Foods</h4>
                            <button class="btn btn-sm" id="clear-selected">
                                Clear All
                            </button>
                        </div>
                        <div id="selected-foods-list"></div>
                    </div>
                    
                    <div class="meal-summary">
                        <div class="summary-row">
                            <span>Total Calories:</span>
                            <span id="total-meal-calories">0</span>
                        </div>
                        <button class="btn btn-primary btn-block" id="log-meal">
                            <i class="fas fa-check"></i> Log This Meal
                        </button>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">
                            <i class="fas fa-list"></i> Today's Meals
                        </div>
                    </div>
                    <div id="today-meals-list"></div>
                </div>
            </div>
        `;
    }

    // ... (Other template creation methods)

    // ========== INITIALIZATION ==========
    handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab') || 'dashboard';
        this.switchTab(tab);
    }

    // ========== UTILITY METHODS ==========
    calculateBMI(weight, height) {
        const heightM = height / 100;
        return (weight / (heightM * heightM)).toFixed(1);
    }

    changeDate(days) {
        this.currentDate.setDate(this.currentDate.getDate() + days);
        this.updateUI();
        this.loadTodayLogs().then(() => {
            this.updateDashboard();
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FitTrackPWA();
    window.fitTrack = app; // Make available globally for debugging
});

// Handle app visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.fitTrack) {
        window.fitTrack.updateUI();
    }
});

// Prevent drag-and-drop file opening
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Handle beforeunload for unsaved changes
window.addEventListener('beforeunload', (e) => {
    // You can add logic to check for unsaved changes
    // e.preventDefault();
    // e.returnValue = '';
});