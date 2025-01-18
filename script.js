const CONFIG = {
  "features": {
    "referral": true,
    "spinWheel": true,
    "withdrawal": false
  },
  "missions": [
    {
      "id": 1,
      "title": "Join WhatsApp Group",
      "reward": 10,
      "link": "https://chat.whatsapp.com/GlEF7rNUKqX6cIsRdBgxMu"
    },
    {
      "id": 2,
      "title": "Join Telegram Channel",
      "reward": 10,
      "link": "https://t.me/lux_earn"
    },
    
  
  ],
  "spinWheel": {
    "prizes": [
      1,
      5,
      10,
      15,
      20,
      25,
      30,
      20,
      8,
      12,
      18,
      22
    ]
  },
  "banks": [
    "Access Bank",
    "First Bank",
    "GT Bank",
    "UBA",
    "Zenith Bank",
    "Kuda Bank",
    "Opay",
    "Palmpay"
  ]
};

// Utility Functions
const generateReferralCode = (username) => {
    const chars = username.substring(0, 2).toUpperCase() + 
                 Math.random().toString(36).substring(2, 5).toUpperCase();
    return chars;
};

const encryptData = (data) => {
    return btoa(JSON.stringify(data));
};

const showCustomAlert = (title, message, buttons = []) => {
    const modal = document.getElementById('custom-alert');
    const titleEl = document.getElementById('alert-title');
    const messageEl = document.getElementById('alert-message');
    const buttonsEl = document.getElementById('alert-buttons');

    titleEl.textContent = title;
    messageEl.textContent = message;
    buttonsEl.innerHTML = '';

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.textContent = btn.text;
        button.onclick = () => {
            btn.action();
            if (btn.closeModal) modal.classList.add('hidden');
        };
        buttonsEl.appendChild(button);
    });

    modal.classList.remove('hidden');
};

const showLoading = (duration) => {
    const spinner = document.getElementById('loading-spinner');
    spinner.classList.remove('hidden');
    return new Promise(resolve => setTimeout(() => {
        spinner.classList.add('hidden');
        resolve();
    }, duration));
};

// User Management
class UserManager {
    constructor() {
        this.loadUser();
        this.setupEventListeners();
    }

    loadUser() {
        this.user = JSON.parse(localStorage.getItem('user')) || null;
        if (this.user) {
            document.getElementById('registration-section').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            this.updateBalanceDisplay();
        }
    }

    async register(username, email, referralCode) {
        if (referralCode && referralCode.length !== 5) {
            showCustomAlert('Invalid Referral', 'Referral code must be exactly 5 characters long.', [
                { text: 'OK', action: () => {}, closeModal: true }
            ]);
            return;
        }

        this.user = {
            username,
            email,
            balance: referralCode ? 10 : 0,
            referralBalance: 0,
            withdrawalBalance: 0,
            referralCode: generateReferralCode(username),
            referrals: 0,
            completedMissions: [],
            lastSpin: null,
            lastReferralReward: null
        };

        localStorage.setItem('user', JSON.stringify(this.user));

        await this.showSocialVerification();
    }

    async showSocialVerification() {
        showCustomAlert('Join Our Community', 'Please join our WhatsApp group and Telegram channel:', [
            { 
                text: 'Join WhatsApp', 
                action: () => window.open('https://chat.whatsapp.com/GlEF7rNUKqX6cIsRdBgxMu', '_blank'),
                closeModal: false 
            },
            { 
                text: 'Join Telegram', 
                action: () => window.open('https://t.me/lux_earn', '_blank'),
                closeModal: false 
            },
            { 
                text: 'Verify', 
                action: async () => {
                    await showLoading(15000);
                    document.getElementById('registration-section').classList.add('hidden');
                    document.getElementById('main-app').classList.remove('hidden');
                    this.updateBalanceDisplay();
                },
                closeModal: true 
            }
        ]);
    }

    updateBalanceDisplay() {
        document.getElementById('total-balance').textContent = `₦${this.user.balance.toFixed(2)}`;
        document.getElementById('referral-balance').textContent = `₦${this.user.referralBalance.toFixed(2)}`;
        document.getElementById('withdrawal-balance').textContent = `₦${this.user.withdrawalBalance.toFixed(2)}`;
        document.getElementById('referral-count').textContent = `${this.user.referrals} referrals`;
        document.getElementById('referral-code-display').textContent = this.user.referralCode;
    }

    setupEventListeners() {
        // Registration Form
        document.getElementById('registration-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const referralCode = document.getElementById('referral-code').value;
            this.register(username, email, referralCode);
        });

        // Copy Referral Code
        document.getElementById('copy-referral').addEventListener('click', () => {
            if (!CONFIG.features.referral) {
                showCustomAlert('Feature Unavailable', 'Referral system is currently unavailable.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            navigator.clipboard.writeText(this.user.referralCode);
            showCustomAlert('Success', 'Referral code copied! Reward will be added in 12 hours.', [
                { text: 'OK', action: () => {}, closeModal: true }
            ]);

            const now = new Date();
            if (!this.user.lastReferralReward || 
                (now - new Date(this.user.lastReferralReward)) >= 12 * 60 * 60 * 1000) {
                this.user.lastReferralReward = now.toISOString();
                this.user.referrals++;
                this.user.referralBalance += 50;
                this.user.balance += 50;
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateBalanceDisplay();
            }
        });

        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                document.querySelectorAll('.content-section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                const sectionId = btn.getAttribute('data-section');
                document.getElementById(sectionId).classList.remove('hidden');
            });
        });

        // Setup missions
        this.setupMissions();
        
        // Setup spin wheel
        this.setupSpinWheel();
        
        // Setup withdrawal
        this.setupWithdrawal();
    }

    setupMissions() {
        const container = document.querySelector('.missions-container');
        CONFIG.missions.forEach(mission => {
            const card = document.createElement('div');
            card.className = 'mission-card';
            card.innerHTML = `
                <h3>${mission.title}</h3>
                <p>Reward: ₦${mission.reward}</p>
                <button onclick="window.open('${mission.link}', '_blank')">Complete</button>
                <button class="verify-btn" data-mission="${mission.id}">Verify</button>
            `;
            container.appendChild(card);
        });

        container.addEventListener('click', async (e) => {
            if (e.target.classList.contains('verify-btn')) {
                const missionId = parseInt(e.target.getAttribute('data-mission'));
                if (!this.user.completedMissions.includes(missionId)) {
                    await showLoading(15000);
                    const mission = CONFIG.missions.find(m => m.id === missionId);
                    this.user.balance += mission.reward;
                    this.user.completedMissions.push(missionId);
                    localStorage.setItem('user', JSON.stringify(this.user));
                    this.updateBalanceDisplay();
                    showCustomAlert('Success', `Congratulations! You earned ₦${mission.reward}`, [
                        { text: 'OK', action: () => {}, closeModal: true }
                    ]);
                }
            }
        });
    }

    setupSpinWheel() {
        const canvas = document.getElementById('wheel-canvas');
        const ctx = canvas.getContext('2d');
        const spinBtn = document.getElementById('spin-btn');
        const prizes = CONFIG.spinWheel.prizes;
        const numSegments = prizes.length;
        const segmentAngle = (2 * Math.PI) / numSegments;
        
        canvas.width = 300;
        canvas.height = 300;
        const radius = 140;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const drawWheel = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < numSegments; i++) {
                ctx.beginPath();
                ctx.fillStyle = i % 2 === 0 ? '#6c5ce7' : '#a29bfe';
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, i * segmentAngle, (i + 1) * segmentAngle);
                ctx.closePath();
                ctx.fill();
                
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(i * segmentAngle + segmentAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffffff';
                ctx.font = '16px JetBrains Mono';
                ctx.fillText(`₦${prizes[i]}`, radius - 20, 0);
                ctx.restore();
            }
        };

        drawWheel();

        spinBtn.addEventListener('click', async () => {
            if (!CONFIG.features.spinWheel) {
                showCustomAlert('Feature Unavailable', 'Spin wheel is currently unavailable.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            const now = new Date();
            if (this.user.lastSpin && 
                (now - new Date(this.user.lastSpin)) < 24 * 60 * 60 * 1000) {
                showCustomAlert('Wait Required', 'You can spin again in 24 hours.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            const spins = 5 + Math.floor(Math.random() * 5);
            const randomPrize = Math.floor(Math.random() * prizes.length);
            const totalRotation = (spins * 2 * Math.PI) + (randomPrize * segmentAngle);
            let currentRotation = 0;
            const animationDuration = 3000;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / animationDuration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                
                currentRotation = totalRotation * easeOut;
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(currentRotation);
                ctx.translate(-centerX, -centerY);
                drawWheel();
                ctx.restore();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.user.balance += prizes[randomPrize];
                    this.user.lastSpin = now.toISOString();
                    localStorage.setItem('user', JSON.stringify(this.user));
                    this.updateBalanceDisplay();
                    showCustomAlert('Congratulations!', `You won ₦${prizes[randomPrize]}!`, [
                        { text: 'OK', action: () => {}, closeModal: true }
                    ]);
                }
            };

            animate();
        });
    }

    setupWithdrawal() {
        const bankSelect = document.getElementById('bank-select');
        CONFIG.banks.forEach(bank => {
            const option = document.createElement('option');
            option.value = bank;
            option.textContent = bank;
            bankSelect.appendChild(option);
        });

        document.getElementById('withdraw-btn').addEventListener('click', () => {
            if (!CONFIG.features.withdrawal) {
                showCustomAlert('Feature Unavailable', 'Withdrawal system is currently unavailable.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            const accountName = document.getElementById('account-name').value;
            const accountNumber = document.getElementById('account-number').value;
            const bank = bankSelect.value;
            const amount = parseFloat(document.getElementById('withdrawal-amount').value);

            if (!accountName || !accountNumber || !bank || !amount) {
                showCustomAlert('Error', 'Please fill all fields.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            if (amount < 1000) {
                showCustomAlert('Error', 'Minimum withdrawal amount is ₦1,000.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            if (amount > this.user.balance) {
                showCustomAlert('Error', 'Insufficient balance.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            const withdrawalData = {
                username: this.user.username,
                email: this.user.email,
                accountName,
                accountNumber,
                bank,
                amount,
                totalBalance: this.user.balance,
                timestamp: new Date().toISOString()
            };

            const encryptedData = encryptData(withdrawalData);

            this.user.balance -= amount;
            this.user.withdrawalBalance += amount;
            localStorage.setItem('user', JSON.stringify(this.user));
            this.updateBalanceDisplay();

            showCustomAlert('Withdrawal Request', 'Click the button below to send your withdrawal request:', [
                { 
                    text: 'Send to WhatsApp', 
                    action: () => {
                        const whatsappUrl = `https://wa.me/2347030758645?text=${encodeURIComponent(encryptedData)}`;
                        window.open(whatsappUrl, '_blank');
                    },
                    closeModal: true 
                }
            ]);
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if browser supports required features
    if (!localStorage) {
        showCustomAlert('Error', 'Your browser does not support local storage. Please use a modern browser.', [
            { text: 'OK', action: () => {}, closeModal: true }
        ]);
        return;
    }

    // Initialize user manager
    const userManager = new UserManager();

    // Update timer displays
    setInterval(() => {
        if (userManager.user) {
            // Update spin timer
            if (userManager.user.lastSpin) {
                const nextSpin = new Date(userManager.user.lastSpin);
                nextSpin.setHours(nextSpin.getHours() + 24);
                const now = new Date();
                if (now < nextSpin) {
                    const timeLeft = nextSpin - now;
                    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                    document.getElementById('timer-display').textContent = 
                        `Next spin available in ${hours}h ${minutes}m`;
                } else {
                    document.getElementById('timer-display').textContent = 'Spin available!';
                }
            }

            // Auto-save user data every minute
            localStorage.setItem('user', JSON.stringify(userManager.user));
        }
    }, 60000);
});