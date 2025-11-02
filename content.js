// ============================================
// WORDWISE ASSISTANT - Enhanced Version
// With Better Lip-Sync & Word History
// ============================================

// Track if popup is currently showing
let currentPopup = null;
let isSpeaking = false;
let lipSyncInterval = null;

// Listen for text selection on the page
document.addEventListener('mouseup', function(event) {
    // Small delay to ensure selection is complete
    setTimeout(() => {
        handleTextSelection(event);
    }, 10);
});

// Main function to handle word selection
function handleTextSelection(event) {
    // Get the selected text
    let selectedText = window.getSelection().toString().trim();
    
    // Remove any existing popup first
    removePopup();
    
    // Only proceed if user selected a single word (not empty, not too long)
    if (selectedText && selectedText.length > 0 && selectedText.length < 30 && !selectedText.includes(' ')) {
        // Clean the word (remove punctuation)
        let cleanWord = selectedText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
        
        // Show the popup near where user clicked
        showPopup(cleanWord, event.pageX, event.pageY);
    }
}

// Create and show the popup
function showPopup(word, x, y) {
    // Create popup container
    currentPopup = document.createElement('div');
    currentPopup.id = 'wordwise-popup';
    currentPopup.className = 'wordwise-popup';
    
    // Position popup near the selected word
    currentPopup.style.left = x + 'px';
    currentPopup.style.top = (y + 20) + 'px';
    
    // Add loading state with fixed avatar HTML
    currentPopup.innerHTML = `
        <div class="wordwise-header">
            <div class="wordwise-history-btn" id="wordwise-history" title="View Word History">📚</div>
            <div class="wordwise-close" id="wordwise-close">×</div>
        </div>
        <div class="wordwise-avatar-container">
            <div class="avatar-face">
                <div class="avatar-eyes">
                    <div class="eye left"></div>
                    <div class="eye right"></div>
                </div>
                <div class="avatar-mouth" id="avatar-mouth"></div>
            </div>
        </div>
        <div class="wordwise-content">
            <div class="wordwise-loading">Looking up "${word}"...</div>
        </div>
    `;
    
    // Add popup to page
    document.body.appendChild(currentPopup);
    
    // Add close button functionality
    document.getElementById('wordwise-close').addEventListener('click', removePopup);
    
    // Add history button functionality
    document.getElementById('wordwise-history').addEventListener('click', showHistory);
    
    // Fetch word meaning from Dictionary API
    fetchWordMeaning(word);
}

// Fetch meaning from Free Dictionary API
async function fetchWordMeaning(word) {
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        
        if (!response.ok) {
            throw new Error('Word not found');
        }
        
        const data = await response.json();
        displayWordInfo(data[0], word);
        
        // Save word to history
        saveWordToHistory(word, data[0]);
        
    } catch (error) {
        // Show error message if word not found
        displayError(word);
    }
}

// Display word information in popup
function displayWordInfo(wordData, word) {
    // Get the first meaning
    let meaning = wordData.meanings[0];
    let definition = meaning.definitions[0].definition;
    let partOfSpeech = meaning.partOfSpeech;
    
    // Get pronunciation (phonetic text)
    let phonetic = wordData.phonetic || '';
    if (wordData.phonetics && wordData.phonetics.length > 0) {
        phonetic = wordData.phonetics[0].text || phonetic;
    }
    
    // Simplify the definition (make it easier to understand)
    let simplifiedDefinition = simplifyDefinition(definition);
    
    // Get example if available
    let example = meaning.definitions[0].example || '';
    
    // Update popup content
    const contentDiv = currentPopup.querySelector('.wordwise-content');
    contentDiv.innerHTML = `
        <div class="wordwise-word">${word}</div>
        ${phonetic ? `<div class="wordwise-phonetic">${phonetic}</div>` : ''}
        <div class="wordwise-pos">${partOfSpeech}</div>
        <div class="wordwise-meaning-label">💡 Simple Meaning:</div>
        <div class="wordwise-meaning">${simplifiedDefinition}</div>
        ${example ? `<div class="wordwise-example-label">📝 Example:</div><div class="wordwise-example">"${example}"</div>` : ''}
        <button class="wordwise-speak-btn" id="speak-btn">
            🔊 Hear Pronunciation
        </button>
        <div class="wordwise-saved">✅ Saved to your word history!</div>
    `;
    
    // Add speak button functionality
    document.getElementById('speak-btn').addEventListener('click', () => {
        speakWord(word, phonetic);
    });
    
    // Auto-speak the word once
    setTimeout(() => {
        speakWord(word, phonetic);
    }, 500);
}

// IMPROVED: Simplify definition to VERY simple words everyone can understand
function simplifyDefinition(definition) {
    // Dictionary of complex words to simple replacements
    const simplifications = {
        // Complex verbs to simple
        'utilize': 'use',
        'acquire': 'get',
        'demonstrate': 'show',
        'possess': 'have',
        'commence': 'start',
        'terminate': 'end',
        'attempt': 'try',
        'obtain': 'get',
        'receive': 'get',
        'proceed': 'go',
        'indicate': 'show',
        'construct': 'build',
        'purchase': 'buy',
        'endeavor': 'try',
        'assist': 'help',
        
        // Complex nouns to simple
        'individual': 'person',
        'residence': 'home',
        'automobile': 'car',
        'vicinity': 'area',
        'furthermore': 'also',
        'therefore': 'so',
        'however': 'but',
        'nevertheless': 'but',
        'subsequently': 'then',
        'consequently': 'so',
        
        // Complex adjectives to simple
        'magnificent': 'very beautiful',
        'enormous': 'very big',
        'minuscule': 'very small',
        'adequate': 'enough',
        'sufficient': 'enough',
        'numerous': 'many',
        'various': 'different',
        'appropriate': 'right',
        'incorrect': 'wrong',
        'difficult': 'hard',
        
        // Remove these words completely
        'particularly': '',
        'especially': '',
        'specifically': '',
        'typically': '',
        'generally': '',
        'usually': '',
        'frequently': 'often',
        'occasionally': 'sometimes',
        'approximately': 'about',
    };
    
    let simplified = definition.toLowerCase();
    
    // Replace complex words with simple ones
    for (let [complex, simple] of Object.entries(simplifications)) {
        let regex = new RegExp('\\b' + complex + '\\b', 'gi');
        simplified = simplified.replace(regex, simple);
    }
    
    // Remove formal phrases
    simplified = simplified.replace(/in order to/g, 'to');
    simplified = simplified.replace(/as a result of/g, 'because of');
    simplified = simplified.replace(/due to the fact that/g, 'because');
    simplified = simplified.replace(/at the present time/g, 'now');
    simplified = simplified.replace(/in the event that/g, 'if');
    simplified = simplified.replace(/with regard to/g, 'about');
    
    // Remove semicolons and replace with periods
    simplified = simplified.replace(/;/g, '.');
    
    // Clean up extra spaces
    simplified = simplified.replace(/\s+/g, ' ').trim();
    
    // Keep only first sentence if too long
    if (simplified.length > 120) {
        let sentences = simplified.split('.');
        simplified = sentences[0] + '.';
    }
    
    // Capitalize first letter
    simplified = simplified.charAt(0).toUpperCase() + simplified.slice(1);
    
    // If still too complex, add a simple version prefix
    if (simplified.length > 80 || /\b(wherein|whereby|aforementioned|heretofore)\b/i.test(simplified)) {
        // Extract the core meaning
        simplified = makeEvenSimpler(simplified);
    }
    
    return simplified;
}

// NEW: Make even simpler for very complex definitions
function makeEvenSimpler(text) {
    // Common patterns to simplify
    const patterns = [
        { pattern: /the action of (.+)/i, replace: '$1' },
        { pattern: /the state of being (.+)/i, replace: 'being $1' },
        { pattern: /the quality of being (.+)/i, replace: 'being $1' },
        { pattern: /a person who (.+)/i, replace: 'someone who $1' },
        { pattern: /something that (.+)/i, replace: 'thing that $1' },
        { pattern: /the process of (.+)/i, replace: '$1' },
    ];
    
    let simplified = text;
    
    for (let {pattern, replace} of patterns) {
        if (pattern.test(simplified)) {
            simplified = simplified.replace(pattern, replace);
            break;
        }
    }
    
    return simplified;
}

// IMPROVED: Speak the word with human-like pronunciation
function speakWord(word, phonetic) {
    if (isSpeaking) return;
    
    isSpeaking = true;
    
    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.6; // Slower, more natural
    utterance.pitch = 1.2; // Natural female pitch
    utterance.volume = 1;
    
    // Wait for voices to load, then select best female voice
    let voicesLoaded = false;
    
    function setVoice() {
        const voices = window.speechSynthesis.getVoices();
        
        // Priority order for most natural female voices
        const preferredVoices = [
            'Google US English Female',
            'Microsoft Zira',
            'Samantha',
            'Victoria',
            'Karen',
            'Moira',
            'Tessa',
            'Fiona'
        ];
        
        // Find best match
        let selectedVoice = null;
        for (let preferred of preferredVoices) {
            selectedVoice = voices.find(voice => voice.name.includes(preferred));
            if (selectedVoice) break;
        }
        
        // Fallback: any female voice
        if (!selectedVoice) {
            selectedVoice = voices.find(voice => 
                voice.name.toLowerCase().includes('female') ||
                voice.name.toLowerCase().includes('woman')
            );
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        voicesLoaded = true;
    }
    
    // Load voices if not already loaded
    if (window.speechSynthesis.getVoices().length > 0) {
        setVoice();
    } else {
        window.speechSynthesis.onvoiceschanged = setVoice;
    }
    
    const avatarMouth = document.getElementById('avatar-mouth');
    
    // IMPROVED: More realistic lip-sync based on syllables
    if (avatarMouth) {
        avatarMouth.classList.add('talking');
        
        // Estimate syllables for better sync
        let syllables = word.match(/[aeiou]+/gi) || [word];
        let syllableCount = syllables.length;
        
        // Natural mouth movement pattern (simulates real speech)
        let mouthPattern = ['closed', 'open', 'wide', 'open', 'round', 'open', 'closed'];
        let patternIndex = 0;
        
        // Adaptive timing based on word length
        let changeInterval = syllableCount > 3 ? 80 : 120;
        
        // Smooth transitions between mouth shapes
        lipSyncInterval = setInterval(() => {
            if (avatarMouth) {
                // Remove all states
                ['open', 'wide', 'round', 'closed'].forEach(state => {
                    avatarMouth.classList.remove('mouth-' + state);
                });
                
                // Add current state with smooth transition
                avatarMouth.classList.add('mouth-' + mouthPattern[patternIndex]);
                patternIndex = (patternIndex + 1) % mouthPattern.length;
            }
        }, changeInterval);
    }
    
    // When speech starts, sync better
    utterance.onstart = function() {
        if (avatarMouth) {
            avatarMouth.style.transition = 'all 0.08s ease-in-out';
        }
    };
    
    // When speech ends, stop animation smoothly
    utterance.onend = function() {
        if (avatarMouth) {
            avatarMouth.classList.remove('talking');
            // Smooth return to neutral position
            ['open', 'wide', 'round'].forEach(state => {
                avatarMouth.classList.remove('mouth-' + state);
            });
            avatarMouth.classList.add('mouth-closed');
            
            setTimeout(() => {
                if (avatarMouth) {
                    avatarMouth.classList.remove('mouth-closed');
                }
            }, 200);
        }
        // Clear lip-sync interval
        if (lipSyncInterval) {
            clearInterval(lipSyncInterval);
            lipSyncInterval = null;
        }
        isSpeaking = false;
    };
    
    // Speak the word with slight delay for voice loading
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 100);
}

// Display error message
function displayError(word) {
    const contentDiv = currentPopup.querySelector('.wordwise-content');
    contentDiv.innerHTML = `
        <div class="wordwise-word">${word}</div>
        <div class="wordwise-error">
            <p>😕 Sorry, couldn't find this word in the dictionary.</p>
            <p>It might be:</p>
            <ul>
                <li>A proper name</li>
                <li>Misspelled</li>
                <li>Slang or informal</li>
            </ul>
        </div>
    `;
}

// NEW: Save word to history in localStorage
function saveWordToHistory(word, wordData) {
    try {
        // Get existing history or create new array
        let history = JSON.parse(localStorage.getItem('wordwise-history') || '[]');
        
        // Create word entry
        let wordEntry = {
            word: word,
            meaning: wordData.meanings[0].definitions[0].definition,
            partOfSpeech: wordData.meanings[0].partOfSpeech,
            phonetic: wordData.phonetic || '',
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };
        
        // Check if word already exists (update it instead of duplicate)
        let existingIndex = history.findIndex(item => item.word === word);
        if (existingIndex !== -1) {
            history[existingIndex] = wordEntry;
        } else {
            // Add to beginning of array (most recent first)
            history.unshift(wordEntry);
        }
        
        // Keep only last 50 words
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        // Save back to localStorage
        localStorage.setItem('wordwise-history', JSON.stringify(history));
        
    } catch (error) {
        console.log('Could not save to history:', error);
    }
}

// NEW: Show word history
function showHistory() {
    try {
        let history = JSON.parse(localStorage.getItem('wordwise-history') || '[]');
        
        if (history.length === 0) {
            alert('📚 No words saved yet!\n\nStart selecting words to build your vocabulary list.');
            return;
        }
        
        // Create history popup
        let historyPopup = document.createElement('div');
        historyPopup.className = 'wordwise-history-popup';
        historyPopup.innerHTML = `
            <div class="history-header">
                <h3>📚 Your Word History</h3>
                <button class="history-close" id="history-close">×</button>
            </div>
            <div class="history-stats">
                <div class="stat">
                    <span class="stat-number">${history.length}</span>
                    <span class="stat-label">Words Learned</span>
                </div>
            </div>
            <div class="history-actions">
                <button class="history-clear-btn" id="clear-history">🗑️ Clear All</button>
                <button class="history-export-btn" id="export-history">📥 Export</button>
            </div>
            <div class="history-list">
                ${history.map(item => `
                    <div class="history-item">
                        <div class="history-word-header">
                            <span class="history-word">${item.word}</span>
                            <span class="history-date">${item.date}</span>
                        </div>
                        <div class="history-phonetic">${item.phonetic}</div>
                        <div class="history-pos">${item.partOfSpeech}</div>
                        <div class="history-meaning">${item.meaning}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(historyPopup);
        
        // Add event listeners
        document.getElementById('history-close').addEventListener('click', () => {
            historyPopup.remove();
        });
        
        document.getElementById('clear-history').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all saved words?')) {
                localStorage.removeItem('wordwise-history');
                historyPopup.remove();
                alert('✅ History cleared!');
            }
        });
        
        document.getElementById('export-history').addEventListener('click', () => {
            exportHistory(history);
        });
        
    } catch (error) {
        alert('Error loading history: ' + error.message);
    }
}

// NEW: Export history as text file
function exportHistory(history) {
    let text = '📚 WordWise Assistant - My Vocabulary List\n';
    text += '='.repeat(50) + '\n\n';
    
    history.forEach((item, index) => {
        text += `${index + 1}. ${item.word.toUpperCase()}\n`;
        text += `   Pronunciation: ${item.phonetic}\n`;
        text += `   Type: ${item.partOfSpeech}\n`;
        text += `   Meaning: ${item.meaning}\n`;
        text += `   Learned on: ${item.date} at ${item.time}\n\n`;
    });
    
    // Create download link
    let blob = new Blob([text], { type: 'text/plain' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `wordwise-vocabulary-${new Date().toLocaleDateString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('✅ Vocabulary list exported!');
}

// Remove popup from page
function removePopup() {
    if (currentPopup) {
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        isSpeaking = false;
        
        // Clear lip-sync interval
        if (lipSyncInterval) {
            clearInterval(lipSyncInterval);
            lipSyncInterval = null;
        }
        
        // Remove popup element
        currentPopup.remove();
        currentPopup = null;
    }
}

// Close popup when clicking outside
document.addEventListener('click', function(event) {
    if (currentPopup && !currentPopup.contains(event.target)) {
        // Check if click is not on selected text
        let selection = window.getSelection().toString();
        if (!selection) {
            // Don't close if clicking on history popup
            if (!event.target.closest('.wordwise-history-popup')) {
                removePopup();
            }
        }
    }
});

// Close popup when pressing Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        removePopup();
        // Also close history popup if open
        let historyPopup = document.querySelector('.wordwise-history-popup');
        if (historyPopup) {
            historyPopup.remove();
        }
    }
});

console.log('WordWise Assistant is ready! Select any word to learn it.');