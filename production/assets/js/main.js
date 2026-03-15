/**
 * Management System - Main JavaScript
 * Version: 2.0.0
 * Author: Management System Team
 */

'use strict';

// ===========================
// Configuration
// ===========================
const CONFIG = {
    APP_URL: window.location.origin,
    LOGIN_PATH: '/login',
    ANIMATION_DELAY: 500,
    CACHE_VERSION: 'v2.0.0'
};

// ===========================
// Page Initialization
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Management System initialized');
    
    // Hide loading screen
    hideLoadingScreen();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize keyboard navigation
    initializeKeyboardNavigation();
    
    // Log performance metrics
    logPerformanceMetrics();
});

// ===========================
// Loading Screen
// ===========================
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const container = document.querySelector('.container');
    
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        if (container) {
            container.style.display = 'block';
        }
    }, CONFIG.ANIMATION_DELAY);
}

// ===========================
// Navigation
// ===========================
function navigateToSystem(system) {
    console.log(`🚀 Navigating to system: ${system}`);
    
    // Add loading feedback
    const card = document.querySelector(`[data-system="${system}"]`);
    if (card) {
        card.style.opacity = '0.6';
        card.style.pointerEvents = 'none';
    }
    
    // Navigate after short delay for visual feedback
    setTimeout(() => {
        window.location.href = CONFIG.LOGIN_PATH;
    }, 200);
}

// Make function globally available
window.navigateToSystem = navigateToSystem;

// ===========================
// Event Listeners
// ===========================
function initializeEventListeners() {
    // Add click listeners to all system cards
    const systemCards = document.querySelectorAll('.system-card');
    
    systemCards.forEach(card => {
        // Keyboard accessibility
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const system = card.getAttribute('data-system');
                if (system) {
                    navigateToSystem(system);
                }
            }
        });
        
        // Mouse hover effects
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.05)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// ===========================
// Keyboard Navigation
// ===========================
function initializeKeyboardNavigation() {
    let currentIndex = -1;
    const cards = Array.from(document.querySelectorAll('.system-card'));
    
    document.addEventListener('keydown', (e) => {
        // Arrow key navigation
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            currentIndex = (currentIndex + 1) % cards.length;
            cards[currentIndex].focus();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            currentIndex = currentIndex <= 0 ? cards.length - 1 : currentIndex - 1;
            cards[currentIndex].focus();
        }
    });
}

// ===========================
// Performance Monitoring
// ===========================
function logPerformanceMetrics() {
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                const connectTime = perfData.responseEnd - perfData.requestStart;
                
                console.log('📊 Performance Metrics:');
                console.log(`   Page Load Time: ${pageLoadTime}ms`);
                console.log(`   Connection Time: ${connectTime}ms`);
                
                // Send to analytics if needed
                if (window.gtag) {
                    window.gtag('event', 'timing_complete', {
                        name: 'load',
                        value: pageLoadTime,
                        event_category: 'Performance'
                    });
                }
            }, 0);
        });
    }
}

// ===========================
// Error Handling
// ===========================
window.addEventListener('error', (e) => {
    console.error('❌ Global error:', e.error);
    // Could send to error tracking service
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Unhandled promise rejection:', e.reason);
    // Could send to error tracking service
});

// ===========================
// Utility Functions
// ===========================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===========================
// Export for testing
// ===========================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        navigateToSystem,
        debounce,
        throttle
    };
}

console.log('🚀 Management System v2.0.0 loaded successfully');