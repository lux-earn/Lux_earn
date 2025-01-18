// GitHub Configuration
const GITHUB_CONFIG = {
    token: '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', // Replace with your GitHub personal access token
    owner: 'lux-earn',
    repo: 'Lux_earn',
    path: 'lux_earn_user_database.json'
};

// App Configuration
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
        }
    ],
    "spinWheel": {
        "prizes": [
            1, 5, 10, 15, 20, 25, 30, 20, 8, 12, 18, 22
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

const encryptPassword = (password) => {
    return CryptoJS.MD5(password).toString();
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

// GitHub API Functions
async function fetchGitHubFile() {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`, {
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch database');
        
        const data = await response.json();
        const content = atob(data.content);
        return {
            content: JSON.parse(content),
            sha: data.sha
        };
    } catch (error) {
        console.error('Error fetching GitHub file:', error);
        throw error;
    }
}

async function updateGitHubFile(newContent, sha) {
    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Update user database',
                content: btoa(JSON.stringify(newContent, null, 2)),
                sha: sha
            })
        });
        
        if (!response.ok) throw new Error('Failed to update database');
        
        return await response.json();
    } catch (error) {
        console.error('Error updating GitHub file:', error);
        throw error;
    }
}

// Cookie Functions
const setCookie = (name, value, days) => {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
};

const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) == 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
};

const deleteCookie = (name) => {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
};

// User Management Class
class UserManager {
    constructor() {
        this.setupEventListeners();
        this.checkAutoLogin();
    }

    async login(username, password) {
        try {
            const { content } = await fetchGitHubFile();
            const user = content.users.find(u => 
                u.username === username && 
                u.encrypted_password === encryptPassword(password)
            );

            if (user) {
                this.user = {
                    ...user,
                    balance: parseFloat(user.balance),
                    refers: parseInt(user.refers)
                };
                document.getElementById('login-section').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                this.updateBalanceDisplay();
                setCookie('username', username, 30);
                setCookie('password', password, 30);
            } else {
                throw new Error('Invalid username or password');
            }
        } catch (error) {
            showCustomAlert('Login Error', error.message, [
                { text: 'OK', action: () => {}, closeModal: true }
            ]);
        }
    }

    async register(username, email, password, referralCode) {
        try {
            const { content, sha } = await fetchGitHubFile();
            
            // Check if username exists
            if (content.users.some(u => u.username === username)) {
                throw new Error('Username already exists');
            }

            // Check if email exists
            if (content.users.some(u => u.email === email)) {
                throw new Error('Email already exists');
            }

            // Create new user
            const newUser = {
                username,
                email,
                encrypted_password: encryptPassword(password),
                referral_code: generateReferralCode(username),
                inviter_referral_code: referralCode || null,
                balance: 0,
                refers: 0
            };

            // Update inviter's referral count and balance if referral code was used
            if (referralCode) {
                const inviterIndex = content.users.findIndex(u => u.referral_code === referralCode);
                if (inviterIndex >= 0) {
                    content.users[inviterIndex].refers += 1;
                    content.users[inviterIndex].balance += 50;
                }
            }

            // Add new user to database
            content.users.push(newUser);

            // Update GitHub file
            await updateGitHubFile(content, sha);

            // Log in the new user
            this.user = newUser;
            document.getElementById('registration-section').classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            this.updateBalanceDisplay();
            setCookie('username', username, 30);
            setCookie('password', password, 30);

            await this.showSocialVerification();
        } catch (error) {
            showCustomAlert('Registration Error', error.message, [
                { text: 'OK', action: () => {}, closeModal: true }
            ]);
        }
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
                },
                closeModal: true 
            }
        ]);
    }

    updateBalanceDisplay() {
        document.getElementById('total-balance').textContent = `₦${this.user.balance.toFixed(2)}`;
        document.getElementById('referral-balance').textContent = `₦${this.user.balance.toFixed(2)}`;
        document.getElementById('withdrawal-balance').textContent = `₦0.00`;
        document.getElementById('referral-count').textContent = `${this.user.refers} referrals`;
        document.getElementById('referral-code-display').textContent = this.user.referral_code;
    }

    async updateUserData() {
        try {
            const { content, sha } = await fetchGitHubFile();
            const userIndex = content.users.findIndex(u => u.username === this.user.username);
            
            if (userIndex >= 0) {
                content.users[userIndex] = {
                    ...this.user,
                    balance: parseFloat(this.user.balance.toFixed(2))
                };
                await updateGitHubFile(content, sha);
            }
        } catch (error) {
            console.error('Error updating user data:', error);
        }
    }

    setupEventListeners() {
        // Login Form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            this.login(username, password);
        });

        // Registration Form
        document.getElementById('registration-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const referralCode = document.getElementById('referral-code').value;

            if (password !== confirmPassword) {
                showCustomAlert('Error', 'Passwords do not match', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            this.register(username, email, password, referralCode);
        });

        // Toggle between login and registration
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('registration-section').classList.remove('hidden');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('registration-section').classList.add('hidden');
            document.getElementById('login-section').classList.remove('hidden');
        });

        // Copy Referral Code
        document.getElementById('copy-referral').addEventListener('click', async () => {
            if (!CONFIG.features.referral) {
                showCustomAlert('Feature Unavailable', 'Referral system is currently unavailable.', [
                    { text: 'OK', action: () => {}, closeModal: true }
                ]);
                return;
            }

            navigator.clipboard.writeText(this.user.referral_code);
            showCustomAlert('Success', 'Referral code copied!', [
                { text: 'OK', action: () => {}, closeModal: true }
            ]);
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
                if (!this.user.completedMissions) {
                    this.user.completedMissions = [];
                }
                
                if (!this.user.completedMissions.includes(missionId)) {
                    await showLoading(15000);
                    const mission = CONFIG.missions.find(m => m.id === missionId);
                    this.user.balance += mission.reward;
                    this.user.completedMissions.push(missionId);
                    await this.updateUserData();
                    this.updateBalanceDisplay();
                    showCustomAlert('Success', `Congratulations! You earned ₦${mission.reward}`, [
                        { text: 'OK', action: () => {}, closeModal: true }
                    ]);
                } else {
                    showCustomAlert('Already Completed', 'You have already completed this mission.', [
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

            if (!this.user.lastSpin) {
                this.user.lastSpin = new Date(0).toISOString();
            }

            const now = new Date();
            const lastSpinDate = new Date(this.user.lastSpin);
            if (now - lastSpinDate < 24 * 60 * 60 * 1000) {
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

            const animate = async () => {
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
                    const prize = prizes[randomPrize];
                    this.user.balance += prize;
                    this.user.lastSpin = now.toISOString();
                    await this.updateUserData();
                    this.updateBalanceDisplay();
                    showCustomAlert('Congratulations!', `You won ₦${prize}!`, [
                        { text: 'OK', action: () => {}, closeModal: true }
                    ]);
                }
            };

            animate();
        });

        // Update spin timer
        setInterval(() => {
            if (this.user && this.user.lastSpin) {
                const now = new Date();
                const lastSpinDate = new Date(this.user.lastSpin);
                const nextSpin = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
                
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
        }, 60000);
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
            this.updateUserData();
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

    checkAutoLogin() {
        const username = getCookie('username');
        const password = getCookie('password');
        if (username && password) {
            this.login(username, password);
        }
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
});