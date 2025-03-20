document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const myPeerIdElement = document.getElementById('my-peer-id');
    const peerIdInput = document.getElementById('peer-id-input');
    const btnConnect = document.getElementById('btn-connect');
    const btnDisconnect = document.getElementById('btn-disconnect');
    const messageInput = document.getElementById('message-input');
    const btnSend = document.getElementById('btn-send');
    const messagesContainer = document.getElementById('messages');
    const statusElement = document.getElementById('status');
    const copyIdBtn = document.getElementById('copy-id');
    const notificationElement = document.getElementById('notification');

    // State
    let peer = null;
    let connection = null;
    let myId = null;
    let connected = false;

    // Initialize PeerJS
    function initializePeer() {
        try {
            peer = new Peer({
                debug: 2
            });

            peer.on('open', (id) => {
                myId = id;
                myPeerIdElement.textContent = id;
                statusElement.textContent = 'Online';
                statusElement.className = 'status online';
                showNotification('Connected to PeerJS server');
            });

            peer.on('connection', handleIncomingConnection);

            peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                showNotification('Error: ' + err.type);

                if (err.type === 'peer-unavailable') {
                    showNotification('Peer not found or unavailable');
                }
            });

            peer.on('disconnected', () => {
                statusElement.textContent = 'Disconnected';
                statusElement.className = 'status offline';
                showNotification('Disconnected from PeerJS server');

                // Try to reconnect
                setTimeout(() => {
                    if (peer && !peer.destroyed) {
                        peer.reconnect();
                    }
                }, 3000);
            });
        } catch (error) {
            console.error('Failed to initialize PeerJS:', error);
            showNotification('Failed to initialize PeerJS');
        }
    }

    // Handle incoming connection
    function handleIncomingConnection(conn) {
        if (connection) {
            // Already connected to someone else
            conn.on('open', () => {
                conn.send({
                    type: 'error',
                    message: 'Host is already connected to another peer'
                });
                setTimeout(() => conn.close(), 1000);
            });
            return;
        }

        connection = conn;

        connection.on('open', () => {
            setConnectedState(true);
            showNotification(`Connected to ${connection.peer}`);
        });

        connection.on('data', handleIncomingData);

        connection.on('close', () => {
            setConnectedState(false);
            showNotification('Peer disconnected');
        });

        connection.on('error', (err) => {
            console.error('Connection error:', err);
            showNotification('Connection error');
        });
    }

    // Handle incoming data
    function handleIncomingData(data) {
        console.log('Received:', data);

        if (data.type === 'error') {
            showNotification(data.message);
            return;
        }

        if (data.message) {
            addMessageToChat(data.message, 'received', data.id);
        }
    }

    // Connect to peer
    function connectToPeer(peerId) {
        if (!peer || peer.destroyed) {
            showNotification('PeerJS not initialized');
            return;
        }

        if (peerId === myId) {
            showNotification('Cannot connect to yourself');
            return;
        }

        if (connection) {
            showNotification('Already connected to a peer');
            return;
        }

        try {
            connection = peer.connect(peerId);

            connection.on('open', () => {
                setConnectedState(true);
                showNotification(`Connected to ${peerId}`);
            });

            connection.on('data', handleIncomingData);

            connection.on('close', () => {
                setConnectedState(false);
                showNotification('Peer disconnected');
            });

            connection.on('error', (err) => {
                console.error('Connection error:', err);
                showNotification('Connection error');
            });
        } catch (error) {
            console.error('Failed to connect:', error);
            showNotification('Failed to connect to peer');
        }
    }

    // Send message
    function sendMessage(message) {
        if (!connection || !connected) {
            showNotification('Not connected to a peer');
            return;
        }

        if (!message.trim()) {
            return;
        }

        try {
            connection.send({
                id: myId,
                message: message
            });

            addMessageToChat(message, 'sent', 'You');
            messageInput.value = '';
        } catch (error) {
            console.error('Failed to send message:', error);
            showNotification('Failed to send message');
        }
    }

    // Add message to chat
    function addMessageToChat(message, type, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = `message-bubble ${type}`;

        const senderElement = document.createElement('div');
        senderElement.className = 'sender-name';
        senderElement.textContent = sender;

        const messageTextElement = document.createElement('div');
        messageTextElement.textContent = message;

        messageElement.appendChild(senderElement);
        messageElement.appendChild(messageTextElement);

        messagesContainer.appendChild(messageElement);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Set connected state
    function setConnectedState(isConnected) {
        connected = isConnected;

        if (isConnected) {
            btnConnect.disabled = true;
            btnDisconnect.disabled = false;
            messageInput.disabled = false;
            btnSend.disabled = false;

            // Clear welcome message
            if (document.querySelector('.welcome-message')) {
                messagesContainer.innerHTML = '';
            }
        } else {
            btnConnect.disabled = false;
            btnDisconnect.disabled = true;
            messageInput.disabled = true;
            btnSend.disabled = true;
            connection = null;
        }
    }

    // Show notification
    function showNotification(message) {
        notificationElement.textContent = message;
        notificationElement.classList.add('show');

        setTimeout(() => {
            notificationElement.classList.remove('show');
        }, 3000);
    }

    // Event listeners
    btnConnect.addEventListener('click', () => {
        const peerId = peerIdInput.value.trim();
        if (peerId) {
            connectToPeer(peerId);
        } else {
            showNotification('Please enter a peer ID');
        }
    });

    btnDisconnect.addEventListener('click', () => {
        if (connection) {
            connection.close();
            setConnectedState(false);
            showNotification('Disconnected from peer');
        }
    });

    btnSend.addEventListener('click', () => {
        sendMessage(messageInput.value);
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput.value);
        }
    });

    copyIdBtn.addEventListener('click', () => {
        if (myId) {
            navigator.clipboard.writeText(myId)
                .then(() => showNotification('ID copied to clipboard'))
                .catch(err => console.error('Failed to copy ID:', err));
        }
    });

    // Initialize when the page loads
    initializePeer();
});
