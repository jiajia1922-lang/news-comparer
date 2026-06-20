// FrameFocus Application Logic v2

class FrameFocusApp {
  constructor() {
    // 1. State Definition
    this.state = {
      theme: localStorage.getItem('ff_theme') || 'light',
      currentUser: JSON.parse(localStorage.getItem('ff_user')) || null,
      bookmarks: JSON.parse(localStorage.getItem('ff_bookmarks')) || [],
      category: 'all',
      searchQuery: '',
      sortOption: 'newest', // 'newest' or 'relevance'
      activeBiases: {
        conservative: true,
        progressive: true,
        neutral: true
      },
      filterPanelOpen: false,
      userSettings: JSON.parse(localStorage.getItem('ff_settings')) || {
        politics: true,
        economy: true,
        society: true,
        culture: true,
        science: true
      },
      authMode: 'login', // 'login' or 'register'
      currentView: 'dashboard', // 'dashboard', 'comparison', 'bookmarks'
      activeIssueId: null,
      activeDetailArticleId: null
    };

    // DOM Elements Cache
    this.dom = {};
  }

  // 2. Initialize application
  init() {
    this.cacheDOMElements();
    this.registerServiceWorker();
    this.applyTheme();
    this.applyUserSettingsToForm();
    this.updateUserAuthUI();
    this.updateCategoryCounts();
    this.renderDashboard();
    
    // Global App Object Reference for HTML Inline event handlers
    window.app = this;
    
    this.showToast('FrameFocus v2: 실시간 대한민국 언론사 대조 시작!');
  }

  cacheDOMElements() {
    this.dom.themeToggle = document.getElementById('btn-theme-toggle');
    this.dom.loginStatusArea = document.getElementById('login-status-area');
    this.dom.dashboardView = document.getElementById('dashboard-view');
    this.dom.comparisonView = document.getElementById('comparison-view');
    this.dom.bookmarksView = document.getElementById('bookmarks-view');
    this.dom.issueFeed = document.getElementById('issue-feed-container');
    this.dom.comparisonGrid = document.getElementById('comparison-cards-grid');
    this.dom.bookmarksGrid = document.getElementById('bookmarks-grid-container');
    this.dom.filterPanel = document.getElementById('advanced-filter-panel');
    
    // Modal elements
    this.dom.loginModal = document.getElementById('login-modal');
    this.dom.settingsModal = document.getElementById('settings-modal');
    this.dom.detailModal = document.getElementById('article-detail-modal');
    
    // Forms
    this.dom.loginForm = document.getElementById('login-form');
    this.dom.settingsForm = document.getElementById('settings-form');
  }

  // ==========================================================================
  // PWA Service Worker Registration
  // ==========================================================================
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered successfully: ', registration.scope);
          })
          .catch((error) => {
            console.error('[PWA] Service Worker registration failed: ', error);
          });
      });
    }
  }

  // ==========================================================================
  // Theme Management
  // ==========================================================================
  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('ff_theme', this.state.theme);
    this.applyTheme();
    this.showToast(this.state.theme === 'light' ? '라이트 모드로 전환되었습니다.' : '다크 모드로 전환되었습니다.');
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    const themeIcon = this.dom.themeToggle.querySelector('i');
    if (this.state.theme === 'dark') {
      themeIcon.className = 'fa-solid fa-sun';
      this.dom.themeToggle.title = '라이트 모드로 전환';
    } else {
      themeIcon.className = 'fa-solid fa-moon';
      this.dom.themeToggle.title = '다크 모드로 전환';
    }
  }

  // ==========================================================================
  // UI Routing & View Transitions
  // ==========================================================================
  navigateToDashboard() {
    this.state.currentView = 'dashboard';
    this.dom.comparisonView.style.display = 'none';
    this.dom.bookmarksView.style.display = 'none';
    this.dom.dashboardView.style.display = 'grid';
    this.updateMobileBottomNavUI();
    this.renderDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateToComparison(issueId) {
    this.state.currentView = 'comparison';
    this.state.activeIssueId = issueId;
    this.dom.dashboardView.style.display = 'none';
    this.dom.bookmarksView.style.display = 'none';
    this.dom.comparisonView.style.display = 'block';
    this.updateMobileBottomNavUI();
    this.renderComparison();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleBookmarksView() {
    if (this.state.currentView === 'bookmarks') {
      this.navigateToDashboard();
    } else {
      this.state.currentView = 'bookmarks';
      this.dom.dashboardView.style.display = 'none';
      this.dom.comparisonView.style.display = 'none';
      this.dom.bookmarksView.style.display = 'block';
      this.updateMobileBottomNavUI();
      this.renderBookmarks();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  handleMobileCompareBtn() {
    if (this.state.activeIssueId) {
      this.navigateToComparison(this.state.activeIssueId);
    } else {
      this.showToast('대조할 시사 이슈를 메인 피드에서 먼저 골라주세요!');
      this.navigateToDashboard();
    }
  }

  updateMobileBottomNavUI() {
    // Sync mobile bottom nav buttons active classes
    const btnHome = document.getElementById('mobile-nav-home');
    const btnCompare = document.getElementById('mobile-nav-compare');
    const btnBookmarks = document.getElementById('mobile-nav-bookmarks');

    if (btnHome) btnHome.classList.remove('active');
    if (btnCompare) btnCompare.classList.remove('active');
    if (btnBookmarks) btnBookmarks.classList.remove('active');

    if (this.state.currentView === 'dashboard') {
      if (btnHome) btnHome.classList.add('active');
    } else if (this.state.currentView === 'comparison') {
      if (btnCompare) btnCompare.classList.add('active');
    } else if (this.state.currentView === 'bookmarks') {
      if (btnBookmarks) btnBookmarks.classList.add('active');
    }
  }

  // ==========================================================================
  // Authentication Business Logic
  // ==========================================================================
  openLoginModal() {
    this.state.authMode = 'login';
    this.updateAuthModalUI();
    this.openModal('login-modal');
  }

  updateAuthModalUI() {
    const title = document.getElementById('login-modal-title');
    const submitBtn = document.getElementById('btn-submit-auth');
    const toggleArea = document.getElementById('login-toggle-area');
    
    if (this.state.authMode === 'login') {
      title.innerText = 'FrameFocus 로그인';
      submitBtn.innerText = '로그인 진행';
      toggleArea.innerHTML = `계정이 없으신가요? <span onclick="window.app.toggleAuthMode()">회원가입하기</span>`;
    } else {
      title.innerText = 'FrameFocus 회원가입';
      submitBtn.innerText = '가입 완료 및 로그인';
      toggleArea.innerHTML = `이미 계정이 있으신가요? <span onclick="window.app.toggleAuthMode()">로그인하기</span>`;
    }
  }

  toggleAuthMode() {
    this.state.authMode = this.state.authMode === 'login' ? 'register' : 'login';
    this.updateAuthModalUI();
  }

  handleLoginSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (password.length < 6) {
      this.showToast('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    this.state.currentUser = { email: email };
    localStorage.setItem('ff_user', JSON.stringify(this.state.currentUser));
    
    this.updateUserAuthUI();
    this.closeModal('login-modal');
    this.dom.loginForm.reset();
    
    this.showToast(`${email}님, 환영합니다!`);
  }

  handleLogout() {
    this.state.currentUser = null;
    localStorage.removeItem('ff_user');
    this.updateUserAuthUI();
    this.showToast('로그아웃 되었습니다.');
    
    if (this.state.currentView === 'bookmarks') {
      this.navigateToDashboard();
    }
  }

  updateUserAuthUI() {
    if (this.state.currentUser) {
      const shortEmail = this.state.currentUser.email.split('@')[0];
      const initial = shortEmail.charAt(0).toUpperCase();
      this.dom.loginStatusArea.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="user-profile-indicator header-nav-desktop">
            <div class="user-avatar">${initial}</div>
            <span style="font-weight: 600;">${shortEmail}</span>
          </div>
          <button class="btn-primary" style="background: var(--text-muted); box-shadow: none; padding: 8px 12px; font-size: 13px;" onclick="window.app.handleLogout()">로그아웃</button>
        </div>
      `;
    } else {
      this.dom.loginStatusArea.innerHTML = `
        <button id="btn-login-modal" class="btn-primary" onclick="window.app.openLoginModal()">로그인</button>
      `;
    }
  }

  // ==========================================================================
  // Settings (Interest Preferences) Business Logic
  // ==========================================================================
  openSettingsModal() {
    this.applyUserSettingsToForm();
    this.openModal('settings-modal');
  }

  applyUserSettingsToForm() {
    const categories = ['politics', 'economy', 'society', 'culture', 'science'];
    categories.forEach(cat => {
      const checkbox = document.getElementById(`pref-${cat}`);
      if (checkbox) {
        checkbox.checked = this.state.userSettings[cat];
      }
    });
  }

  handleSettingsSubmit(event) {
    event.preventDefault();
    const categories = ['politics', 'economy', 'society', 'culture', 'science'];
    
    let hasOneChecked = false;
    categories.forEach(cat => {
      const checkbox = document.getElementById(`pref-${cat}`);
      if (checkbox && checkbox.checked) {
        hasOneChecked = true;
      }
    });

    if (!hasOneChecked) {
      this.showToast('최소 한 개의 관심 분야는 선택하셔야 합니다.');
      return;
    }

    categories.forEach(cat => {
      const checkbox = document.getElementById(`pref-${cat}`);
      if (checkbox) {
        this.state.userSettings[cat] = checkbox.checked;
      }
    });

    localStorage.setItem('ff_settings', JSON.stringify(this.state.userSettings));
    this.closeModal('settings-modal');
    this.updateCategoryCounts();
    
    if (this.state.currentView === 'dashboard') {
      this.renderDashboard();
    }
    
    this.showToast('관심 분야 설정이 저장되었습니다.');
  }

  // ==========================================================================
  // Extended Search & Filtering Engine
  // ==========================================================================
  toggleFilterPanel() {
    this.state.filterPanelOpen = !this.state.filterPanelOpen;
    const filterBtn = document.getElementById('btn-toggle-filter');
    if (this.state.filterPanelOpen) {
      this.dom.filterPanel.classList.add('active');
      filterBtn.style.background = 'var(--primary)';
      filterBtn.style.color = 'white';
    } else {
      this.dom.filterPanel.classList.remove('active');
      filterBtn.style.background = '';
      filterBtn.style.color = '';
    }
  }

  handleSortChange(val) {
    this.state.sortOption = val;
    this.renderDashboard();
  }

  handleBiasFilterChange() {
    this.state.activeBiases.conservative = document.getElementById('filter-bias-con').checked;
    this.state.activeBiases.progressive = document.getElementById('filter-bias-pro').checked;
    this.state.activeBiases.neutral = document.getElementById('filter-bias-neu').checked;
    
    // Check if at least one bias is active to avoid empty comparison grids
    const activeBiasesCount = Object.values(this.state.activeBiases).filter(Boolean).length;
    if (activeBiasesCount === 0) {
      this.showToast('최소 한 성향의 언론사 프레임은 활성화해야 합니다.');
      document.getElementById('filter-bias-neu').checked = true;
      this.state.activeBiases.neutral = true;
    }

    this.renderDashboard();
    if (this.state.currentView === 'comparison') {
      this.renderComparison();
    }
  }

  searchTrending(term) {
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
      searchBar.value = term;
      this.handleSearch(term);
      this.showToast(`인기토픽 '${term}' 검색 결과를 필터링했습니다.`);
    }
  }

  filterByCategory(cat) {
    this.state.category = cat;
    
    const items = document.querySelectorAll('#category-tabs-list .category-item');
    items.forEach(item => item.classList.remove('active'));
    
    const activeItem = document.getElementById(`cat-${cat}`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    const titleEl = document.getElementById('feed-current-title');
    const titlesKo = {
      all: '전체 뉴스 프레임 피드',
      politics: '정치 이슈 프레임 피드',
      economy: '경제 이슈 프레임 피드',
      society: '사회 이슈 프레임 피드',
      culture: '문화 이슈 프레임 피드',
      science: 'IT/과학 이슈 프레임 피드'
    };
    titleEl.innerText = titlesKo[cat] || '뉴스 프레임 피드';

    this.renderDashboard();
  }

  handleSearch(query) {
    this.state.searchQuery = query.trim().toLowerCase();
    this.renderDashboard();
  }

  // Real-time Text Highlighter Utility
  highlightSearchQuery(text) {
    if (!this.state.searchQuery) return text;
    const escapedQuery = this.state.searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, `<mark class="search-highlight">$1</mark>`);
  }

  getFilteredIssues() {
    let result = window.ISSUE_DATA.filter(issue => {
      // 1. Settings filter
      if (!this.state.userSettings[issue.category]) return false;

      // 2. Category Tab Filter
      if (this.state.category !== 'all' && issue.category !== this.state.category) return false;

      // 3. Search Query Filter
      if (this.state.searchQuery) {
        const titleMatch = issue.title.toLowerCase().includes(this.state.searchQuery);
        const descMatch = issue.summaryText.toLowerCase().includes(this.state.searchQuery);
        
        const articleMatch = issue.articles.some(art => {
          // Check bias filter first
          if (!this.state.activeBiases[art.bias]) return false;
          
          return art.title.toLowerCase().includes(this.state.searchQuery) ||
                 art.keywords.some(k => k.toLowerCase().includes(this.state.searchQuery)) ||
                 art.press.toLowerCase().includes(this.state.searchQuery) ||
                 art.content.toLowerCase().includes(this.state.searchQuery);
        });

        return titleMatch || descMatch || articleMatch;
      }

      return true;
    });

    // 4. Advanced Sorting Algorithm
    result.sort((a, b) => {
      if (this.state.sortOption === 'relevance' && this.state.searchQuery) {
        // Find match depth
        const indexA = a.title.toLowerCase().indexOf(this.state.searchQuery);
        const indexB = b.title.toLowerCase().indexOf(this.state.searchQuery);
        
        if (indexA !== indexB) {
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        }
      }
      
      // Default: Newest first
      return new Date(b.date) - new Date(a.date);
    });

    return result;
  }

  updateCategoryCounts() {
    const getCount = (cat) => {
      return window.ISSUE_DATA.filter(issue => {
        if (!this.state.userSettings[issue.category]) return false;
        if (cat === 'all') return true;
        return issue.category === cat;
      }).length;
    };

    const categories = ['all', 'politics', 'economy', 'society', 'culture', 'science'];
    categories.forEach(cat => {
      const countEl = document.getElementById(`count-${cat}`);
      if (countEl) {
        countEl.innerText = getCount(cat);
      }
    });
  }

  // ==========================================================================
  // Rendering Methods
  // ==========================================================================
  renderDashboard() {
    const filtered = this.getFilteredIssues();
    const countEl = document.getElementById('feed-items-count');
    
    countEl.innerText = `총 ${filtered.length}개의 이슈 분석 완료`;

    if (filtered.length === 0) {
      this.dom.issueFeed.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-folder-open"></i></div>
          <p>필터 및 검색어 조화에 부합하는 분석 시사가 없습니다.</p>
          <button class="btn-primary" style="margin-top: 16px;" onclick="window.app.resetFilters()">필터 전체 초기화</button>
        </div>
      `;
      return;
    }

    this.dom.issueFeed.innerHTML = filtered.map(issue => {
      const catBadgeClass = `badge-${issue.category}`;
      const catKo = { politics: '정치', economy: '경제', society: '사회', culture: '문화', science: 'IT/과학' }[issue.category];

      // Prepare actual press cards matching user bias filter
      const articlesHtml = issue.articles.map(art => {
        // If this specific bias is filtered out by advanced filter, don't show preview column
        if (!this.state.activeBiases[art.bias]) return '';

        const highlightedPress = this.highlightSearchQuery(art.press.split(' ')[0]);
        const highlightedTitle = this.highlightSearchQuery(art.title);

        return `
          <div class="frame-preview-col ${art.bias}">
            <div class="frame-preview-press">
              <span class="dot ${art.bias}"></span>
              <span>${highlightedPress}</span>
            </div>
            <div class="frame-preview-title" title="${art.title}">${highlightedTitle}</div>
          </div>
        `;
      }).join('');

      const highlightedMainTitle = this.highlightSearchQuery(issue.title);
      const highlightedMainDesc = this.highlightSearchQuery(issue.summaryText);

      return `
        <article class="issue-card" onclick="window.app.navigateToComparison('${issue.id}')" aria-label="${issue.title}">
          <div class="issue-meta">
            <span class="badge ${catBadgeClass}">${catKo}</span>
            <span><i class="fa-regular fa-calendar"></i> ${issue.date}</span>
          </div>
          <h3 class="issue-title">${highlightedMainTitle}</h3>
          <p class="issue-desc">${highlightedMainDesc}</p>
          
          <div class="issue-frame-previews">
            ${articlesHtml}
          </div>
          
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <button class="btn-primary" style="font-size: 13px; padding: 6px 14px;">
              프레임 대조 및 3줄 요약 비교
              <i class="fa-solid fa-angles-right" style="margin-left: 6px;"></i>
            </button>
          </div>
        </article>
      `;
    }).join('');
  }

  renderComparison() {
    const issue = window.ISSUE_DATA.find(i => i.id === this.state.activeIssueId);
    if (!issue) return;

    const mainTitleEl = document.getElementById('comp-issue-main-title');
    const metaEl = document.getElementById('comp-issue-meta');
    const catKo = { politics: '정치', economy: '경제', society: '사회', culture: '문화', science: 'IT/과학' }[issue.category];
    
    mainTitleEl.innerText = issue.title;
    metaEl.innerHTML = `등록일: ${issue.date} | 분야: ${catKo}`;

    // Filter articles based on active biases
    const activeArticles = issue.articles.filter(art => this.state.activeBiases[art.bias]);
    
    // Dynamically adjust grid layout columns count based on visible cards
    const activeBiasesCount = activeArticles.length;
    this.dom.comparisonGrid.style.gridTemplateColumns = activeBiasesCount === 0 ? '1fr' : `repeat(${activeBiasesCount}, 1fr)`;

    if (activeArticles.length === 0) {
      this.dom.comparisonGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>활성화된 언론사 프레임 성향이 없습니다. 상세 검색 패널에서 필터를 켜주세요.</p>
        </div>
      `;
      return;
    }

    this.dom.comparisonGrid.innerHTML = activeArticles.map(art => {
      const isBookmarked = this.state.bookmarks.includes(art.id);
      const bookmarkClass = isBookmarked ? 'active' : '';
      const bookmarkTitle = isBookmarked ? '북마크 해제' : '북마크 저장';

      const summaryListItems = art.summary.map(s => `<li>${this.highlightSearchQuery(s)}</li>`).join('');
      const keywordPills = art.keywords.map(kw => {
        const highlightedKw = this.highlightSearchQuery(kw);
        return `
          <span class="keyword-pill" 
                data-keyword="${kw}" 
                onmouseover="window.app.highlightMatchingKeywords('${kw}')" 
                onmouseout="window.app.clearKeywordHighlighting()">${highlightedKw}</span>
        `;
      }).join('');

      const highlightedTitle = this.highlightSearchQuery(art.title);
      const highlightedCore = this.highlightSearchQuery(art.highlighted_sentence);

      return `
        <div class="comparison-card ${art.bias}">
          <div>
            <div class="press-badge-row">
              <span class="press-name ${art.bias}"><i class="fa-regular fa-newspaper"></i> ${art.press.split(' ')[0]}</span>
              <span class="bias-tag ${art.bias}">${art.biasKo}</span>
            </div>
            
            <h4 class="comp-article-title" title="${art.title}">${highlightedTitle}</h4>
            
            <div class="comp-keywords-section">
              <div class="section-label">핵심 키워드</div>
              <div class="comp-keywords-wrapper">
                ${keywordPills}
              </div>
            </div>

            <div class="comp-summary-section">
              <div class="section-label"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 3줄 요약</div>
              <ul class="comp-summary-list">
                ${summaryListItems}
              </ul>
            </div>

            <div class="comp-core-section">
              <div class="section-label" style="margin-bottom: 6px;"><i class="fa-solid fa-quote-left"></i> 핵심 프레임 문장</div>
              "${highlightedCore}"
            </div>
          </div>

          <div class="comp-footer">
            <button class="btn-details" onclick="window.app.openArticleDetailModal('${issue.id}', '${art.id}')">
              기사 분석 & 본문 전문 보기
            </button>
            <button class="btn-bookmark-article ${bookmarkClass}" title="${bookmarkTitle}" onclick="window.app.toggleBookmark('${art.id}', event)">
              <i class="fa-solid fa-bookmark"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderBookmarks() {
    const countEl = document.getElementById('bookmark-count-text');
    countEl.innerText = `총 ${this.state.bookmarks.length}개 기사 보관 중`;

    if (this.state.bookmarks.length === 0) {
      this.dom.bookmarksGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-regular fa-bookmark"></i></div>
          <p>저장된 북마크 기사가 없습니다.</p>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">기사 비교 화면에서 북마크 아이콘을 눌러보세요.</p>
        </div>
      `;
      return;
    }

    const bookmarkedArticles = [];
    window.ISSUE_DATA.forEach(issue => {
      issue.articles.forEach(art => {
        if (this.state.bookmarks.includes(art.id)) {
          bookmarkedArticles.push({
            issueId: issue.id,
            issueTitle: issue.title,
            article: art
          });
        }
      });
    });

    this.dom.bookmarksGrid.innerHTML = bookmarkedArticles.map(item => {
      const art = item.article;
      return `
        <div class="bookmark-card ${art.bias}" style="border-left: 4px solid var(--color-${art.bias});">
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              <span>이슈: ${item.issueTitle}</span>
              <span>${art.press.split(' ')[0]}</span>
            </div>
            <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; line-height: 1.4;">${art.title}</h4>
            <div class="comp-keywords-wrapper">
              ${art.keywords.slice(0, 3).map(k => `<span class="keyword-pill" style="font-size: 11px; padding: 2px 8px;">${k}</span>`).join('')}
            </div>
          </div>
          
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button class="btn-details" style="font-size: 12px; padding: 6px 12px;" onclick="window.app.openArticleDetailModal('${item.issueId}', '${art.id}')">
              본문 & 요약 보기
            </button>
            <button class="btn-bookmark-article active" style="width: 32px; height: 32px;" title="북마크 삭제" onclick="window.app.toggleBookmark('${art.id}', event)">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // Bookmark Control Logic
  // ==========================================================================
  toggleBookmark(articleId, event) {
    if (event) event.stopPropagation();

    if (!this.state.currentUser) {
      this.showToast('북마크 기능을 이용하려면 먼저 로그인해야 합니다.');
      this.openLoginModal();
      return;
    }

    const idx = this.state.bookmarks.indexOf(articleId);
    if (idx > -1) {
      this.state.bookmarks.splice(idx, 1);
      this.showToast('북마크가 해제되었습니다.');
    } else {
      this.state.bookmarks.push(articleId);
      this.showToast('북마크에 저장되었습니다.');
    }

    localStorage.setItem('ff_bookmarks', JSON.stringify(this.state.bookmarks));

    if (this.state.currentView === 'comparison') {
      this.renderComparison();
    } else if (this.state.currentView === 'bookmarks') {
      this.renderBookmarks();
    }

    this.updateDetailModalBookmarkUI(articleId);
  }

  updateDetailModalBookmarkUI(articleId) {
    const detailBtn = document.getElementById('btn-detail-modal-bookmark');
    if (detailBtn && this.state.activeDetailArticleId === articleId) {
      const isBookmarked = this.state.bookmarks.includes(articleId);
      if (isBookmarked) {
        detailBtn.classList.add('active');
        detailBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i>`;
      } else {
        detailBtn.classList.remove('active');
        detailBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i>`;
      }
    }
  }

  // ==========================================================================
  // Interactive Keyword Hover Animation
  // ==========================================================================
  highlightMatchingKeywords(keyword) {
    const pills = document.querySelectorAll(`.keyword-pill`);
    pills.forEach(pill => {
      const parentPillText = pill.getAttribute('data-keyword');
      if (parentPillText === keyword) {
        pill.style.transform = 'scale(1.1)';
        pill.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        
        const card = pill.closest('.comparison-card');
        if (card) {
          if (card.classList.contains('conservative')) {
            pill.style.background = 'var(--color-conservative)';
            pill.style.color = 'white';
          } else if (card.classList.contains('progressive')) {
            pill.style.background = 'var(--color-progressive)';
            pill.style.color = 'white';
          } else if (card.classList.contains('neutral')) {
            pill.style.background = 'var(--color-neutral)';
            pill.style.color = 'white';
          }
        }
      }
    });
  }

  clearKeywordHighlighting() {
    const pills = document.querySelectorAll(`.keyword-pill`);
    pills.forEach(pill => {
      pill.style.transform = '';
      pill.style.boxShadow = '';
      pill.style.background = '';
      pill.style.color = '';
    });
  }

  // ==========================================================================
  // Modal Handlers
  // ==========================================================================
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      
      if (modalId === 'article-detail-modal') {
        this.state.activeDetailArticleId = null;
      }
    }
  }

  closeModalOnOverlay(event, modalId) {
    if (event.target === event.currentTarget) {
      this.closeModal(modalId);
    }
  }

  openArticleDetailModal(issueId, articleId) {
    const issue = window.ISSUE_DATA.find(i => i.id === issueId);
    if (!issue) return;
    const art = issue.articles.find(a => a.id === articleId);
    if (!art) return;

    this.state.activeDetailArticleId = articleId;

    const biasTagEl = document.getElementById('detail-article-bias');
    const pressEl = document.getElementById('detail-article-press');
    const titleEl = document.getElementById('detail-article-title');
    const dateEl = document.getElementById('detail-article-date');
    const summaryListEl = document.getElementById('detail-article-summary-list');
    const bodyEl = document.getElementById('detail-article-body');

    biasTagEl.innerText = art.biasKo;
    biasTagEl.className = `bias-tag ${art.bias}`;
    pressEl.innerText = art.press;
    titleEl.innerText = art.title;
    dateEl.innerText = `분석일: ${issue.date} | 프레임 성향: ${art.biasKo}`;

    // Summary lines
    summaryListEl.innerHTML = art.summary.map(s => `<li>${this.highlightSearchQuery(s)}</li>`).join('');

    // Highlight core sentences inside the body
    let bodyHtml = art.content;
    if (art.highlighted_sentence) {
      const escapedSentence = art.highlighted_sentence.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedSentence, 'g');
      bodyHtml = art.content.replace(regex, `<mark class="core-highlight">${art.highlighted_sentence}</mark>`);
    }

    // Highlight search query in the body
    bodyHtml = this.highlightSearchQuery(bodyHtml);

    bodyEl.innerHTML = `<p class="article-body-p">${bodyHtml}</p>`;

    this.updateDetailModalBookmarkUI(articleId);

    const bookmarkBtn = document.getElementById('btn-detail-modal-bookmark');
    bookmarkBtn.onclick = (e) => this.toggleBookmark(articleId, e);

    this.openModal('article-detail-modal');
  }

  resetFilters() {
    this.state.category = 'all';
    this.state.searchQuery = '';
    this.state.sortOption = 'newest';
    this.state.activeBiases = { conservative: true, progressive: true, neutral: true };
    
    const searchBar = document.getElementById('search-bar');
    if (searchBar) searchBar.value = '';

    const sortSelect = document.getElementById('search-sort');
    if (sortSelect) sortSelect.value = 'newest';

    document.getElementById('filter-bias-con').checked = true;
    document.getElementById('filter-bias-pro').checked = true;
    document.getElementById('filter-bias-neu').checked = true;

    const categories = ['politics', 'economy', 'society', 'culture', 'science'];
    categories.forEach(cat => {
      this.state.userSettings[cat] = true;
    });
    localStorage.setItem('ff_settings', JSON.stringify(this.state.userSettings));

    this.updateCategoryCounts();
    this.filterByCategory('all');
    this.showToast('모든 검색 필터 및 정렬 방식이 초기화되었습니다.');
  }

  // ==========================================================================
  // Toast Messages
  // ==========================================================================
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 2500);
  }
}

// Instantiate and initialize the app when document is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new FrameFocusApp();
  app.init();
});
