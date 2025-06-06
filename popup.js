document.addEventListener('DOMContentLoaded', function() {
  const cookieContainer = document.getElementById('cookie');
  const messageElement = document.getElementById('message');
  const clearButton = document.getElementById('clearButton');
  const clearCookiesCheckbox = document.getElementById('clearCookies');
  const clearCacheCheckbox = document.getElementById('clearCache');
  const clearHistoryCheckbox = document.getElementById('clearHistory');
  const flushDNSCheckbox = document.getElementById('flushDNS');
  
  // Setup options UI interaction
  setupOptionsUI();
  
  // Automatically clear cookies when popup opens
  cookieContainer.classList.add('crumble');
  
  // Small delay before clearing cookies for animation to be noticeable
  setTimeout(() => {
    clearCookiesForCurrentSite(function(result) {
      showCookieResults(result);
    });
  }, 300);
  
  // Setup options interaction
  function setupOptionsUI() {
    // Handle checkbox changes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        updateClearButtonState();
      });
    });
    
    // Initial button state update
    updateClearButtonState();
  }
  
  // Update the clear button text and state based on selected options
  function updateClearButtonState() {
    const selectedOptions = [];
    
    if (clearCookiesCheckbox.checked) selectedOptions.push('Cookies');
    if (clearCacheCheckbox.checked) selectedOptions.push('Cache');
    if (clearHistoryCheckbox.checked) selectedOptions.push('History');
    if (flushDNSCheckbox.checked) selectedOptions.push('DNS');
    
    const buttonTextElement = clearButton.querySelector('.button-text');
    
    if (selectedOptions.length === 0) {
      buttonTextElement.textContent = 'Select Items to Clear';
      clearButton.disabled = true;
      clearButton.classList.add('disabled');
    } else if (selectedOptions.length === 1) {
      buttonTextElement.textContent = `Clear ${selectedOptions[0]}`;
      clearButton.disabled = false;
      clearButton.classList.remove('disabled');
    } else if (selectedOptions.length === 4) {
      buttonTextElement.textContent = 'Clear All Data';
      clearButton.disabled = false;
      clearButton.classList.remove('disabled');
    } else {
      buttonTextElement.textContent = `Clear Selected (${selectedOptions.length})`;
      clearButton.disabled = false;
      clearButton.classList.remove('disabled');
    }
  }
  
  // Clear button for additional options
  clearButton.addEventListener('click', function() {
    // Only proceed if button is not disabled
    if (this.disabled) return;
    
    // Add active effect to button
    this.classList.add('clearing');
    
    // Check which options are selected
    const clearCookies = clearCookiesCheckbox.checked;
    const clearCache = clearCacheCheckbox.checked;
    const clearHistory = clearHistoryCheckbox.checked;
    const flushDNS = flushDNSCheckbox.checked;
    
    // Prepare tracking for completion
    let operationsCompleted = 0;
    let operationsTotal = 0;
    let operationResults = [];
    
    // Count selected operations
    if (clearCookies) operationsTotal++;
    if (clearCache) operationsTotal++;
    if (clearHistory) operationsTotal++;
    if (flushDNS) operationsTotal++;
    
    if (operationsTotal === 0) {
      showMessage("Please select at least one item to clear");
      clearButton.classList.remove('clearing');
      return;
    }
    
    // Show more specific message about what's being cleared
    const selectedItems = [];
    if (clearCookies) selectedItems.push('cookies');
    if (clearCache) selectedItems.push('cache');
    if (clearHistory) selectedItems.push('history');
    if (flushDNS) selectedItems.push('network cache');
    
    showMessage(`🔄 Clearing ${selectedItems.join(', ')}...`);
    
    // Clear cookies if selected
    if (clearCookies) {
      clearCookiesForCurrentSite(function(result) {
        operationResults.push(result);
        checkCompletion();
      });
    }
    
    // Clear cache if selected
    if (clearCache) {
      clearBrowsingCache(function(result) {
        operationResults.push(result);
        checkCompletion();
      });
    }
    
    // Clear history if selected
    if (clearHistory) {
      clearBrowsingHistory(function(result) {
        operationResults.push(result);
        checkCompletion();
      });
    }
    
    // Flush DNS if selected
    if (flushDNS) {
      flushDNSCache(function(result) {
        operationResults.push(result);
        checkCompletion();
      });
    }
    
    // Check if all operations are complete and show results
    function checkCompletion() {
      operationsCompleted++;
      if (operationsCompleted === operationsTotal) {
        // Add a small delay for UX
        setTimeout(() => {
          showResults(operationResults);
          clearButton.classList.remove('clearing');
          
          // Add success animation
          cookieContainer.classList.remove('crumble');
          void cookieContainer.offsetWidth; // Force reflow
          cookieContainer.classList.add('crumble');
        }, 500);
      }
    }
  });
  
  // Show results for automatic cookie clearing
  function showCookieResults(result) {
    if (result.success) {
      if (result.count > 0) {
        showSuccess(`🍪 Cleared ${result.count} cookie${result.count !== 1 ? 's' : ''} for ${result.domain}`);
      } else {
        showMessage(`🍪 No cookies found for ${result.domain}`);
      }
    } else {
      showError(result.message);
    }
  }
  
  function clearCookiesForCurrentSite(callback) {
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        callback({type: "cookies", success: false, message: "No active tab found"});
        return;
      }
      
      const activeTab = tabs[0];
      const url = new URL(activeTab.url);
      const domain = url.hostname;
      
      // Get all cookies for the domain
      chrome.cookies.getAll({domain: domain}, function(cookies) {
        if (cookies.length === 0) {
          callback({type: "cookies", success: true, count: 0, domain: domain});
          return;
        }
        
        let cookiesRemoved = 0;
        const totalCookies = cookies.length;
        
        // Remove each cookie
        cookies.forEach(cookie => {
          const protocol = cookie.secure ? "https:" : "http:";
          const cookieUrl = `${protocol}//${cookie.domain}${cookie.path}`;
          
          chrome.cookies.remove({
            url: cookieUrl,
            name: cookie.name
          }, function() {
            cookiesRemoved++;
            if (cookiesRemoved === totalCookies) {
              callback({
                type: "cookies",
                success: true,
                count: totalCookies,
                domain: domain
              });
            }
          });
        });
      });
    });
  }
  
  function clearBrowsingCache(callback) {
    // First, try to get some cache statistics before clearing
    // Note: Chrome doesn't provide exact cache size/count, but we can provide better feedback
    chrome.browsingData.removeCache({
      "since": 0 // Clear all cached data from the beginning of time
    }, function() {
      callback({
        type: "cache",
        success: true,
        message: "Browser cache cleared successfully",
        details: "All cached files, images, and web data have been removed"
      });
    });
  }
  
  function clearBrowsingHistory(callback) {
    // First, get a count of history items before clearing
    chrome.history.search({
      text: '',
      startTime: 0,
      maxResults: 10000 // Get up to 10k items to count
    }, function(historyItems) {
      const historyCount = historyItems.length;
      
      // Now clear all browsing history
      chrome.browsingData.removeHistory({
        "since": 0 // Clear all history from the beginning of time
      }, function() {
        callback({
          type: "history",
          success: true,
          count: historyCount,
          message: `Browsing history cleared successfully`,
          details: `${historyCount} history entries removed`
        });
      });
    });
  }
  
  function flushDNSCache(callback) {
    // Chrome extensions cannot directly flush the OS or browser's internal DNS resolver cache.
    // This function will inform the user of this limitation.
    // We'll clear browser cache as a fallback which may help with some network-related caches.
    chrome.browsingData.removeCache({ "since": 0 }, function() {
        callback({
            type: "dns",
            success: true,
            message: "Browser cache cleared as DNS fallback",
            details: "Direct DNS flush not possible via extensions. Browser cache cleared instead."
        });
    });
  }
  
  // Show results after manual clearing
  function showResults(results) {
    let successCount = 0;
    let totalItemsCleared = 0;
    let errorMessage = '';
    let detailedMessages = [];
    
    results.forEach(result => {
      if (result.success) {
        successCount++;
        if (result.count) {
          totalItemsCleared += result.count;
        }
        
        // Create detailed message for each operation
        let operationMessage = '';
        switch(result.type) {
          case 'cookies':
            operationMessage = `🍪 ${result.count || 0} cookies cleared`;
            if (result.domain) {
              operationMessage += ` for ${result.domain}`;
            }
            break;
          case 'cache':
            operationMessage = `💾 Browser cache cleared`;
            break;
          case 'history':
            operationMessage = `📚 ${result.count || 0} history entries cleared`;
            break;
          case 'dns':
            operationMessage = `🌐 Network cache cleared (DNS fallback)`;
            break;
        }
        detailedMessages.push(operationMessage);
      } else {
        errorMessage = result.message;
      }
    });
    
    if (successCount === results.length) {
      // Show detailed success message
      if (detailedMessages.length > 0) {
        const summary = detailedMessages.join(' • ');
        showSuccess(summary);
      } else {
        showMessage('Operations completed - no items found to clear');
      }
    } else {
      showError(errorMessage || 'Error clearing some items');
    }
  }
  
  // Display a neutral message
  function showMessage(msg) {
    messageElement.textContent = msg;
    messageElement.className = 'message';
  }
  
  // Display an error message
  function showError(msg) {
    messageElement.textContent = msg;
    messageElement.className = 'message error';
  }
  
  // Display a success message
  function showSuccess(msg) {
    messageElement.textContent = msg;
    messageElement.className = 'message success';
  }
}); 
