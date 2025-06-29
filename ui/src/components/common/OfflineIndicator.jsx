import React, { useState, useEffect } from 'react';
import {
  Alert,
  Snackbar,
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  IconButton
} from '@mui/material';
import {
  CloudOff,
  CloudQueue,
  Sync,
  Warning,
  CheckCircle,
  Close,
  Refresh
} from '@mui/icons-material';
import { useWebSocket } from '../../contexts/WebSocketContext';

const OfflineIndicator = () => {
  const {
    isOnline,
    isConnected,
    connectionState,
    offlineQueue,
    getConnectionStats,
    forceReconnect,
    processOfflineQueue
  } = useWebSocket();

  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showReconnectingAlert, setShowReconnectingAlert] = useState(false);
  const [stats, setStats] = useState({});

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      if (getConnectionStats) {
        setStats(getConnectionStats());
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, [getConnectionStats]);

  // Show offline alert when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true);
    } else {
      setShowOfflineAlert(false);
    }
  }, [isOnline]);

  // Show reconnecting alert
  useEffect(() => {
    if (connectionState === 'reconnecting' || connectionState === 'connecting') {
      setShowReconnectingAlert(true);
    } else {
      setShowReconnectingAlert(false);
    }
  }, [connectionState]);

  const handleRetryConnection = () => {
    if (forceReconnect) {
      forceReconnect();
    }
  };

  const handleProcessQueue = () => {
    if (processOfflineQueue) {
      processOfflineQueue();
    }
  };

  return (
    <>
      {/* Offline Alert */}
      <Snackbar
        open={showOfflineAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: 8 }}
      >
        <Alert
          severity="warning"
          variant="filled"
          action={
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setShowOfflineAlert(false)}
            >
              <Close fontSize="small" />
            </IconButton>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              You are offline
            </Typography>
            <Typography variant="caption">
              Changes will be queued and synced when connection is restored
            </Typography>
            {stats.offlineQueueSize > 0 && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={<CloudQueue />}
                  label={`${stats.offlineQueueSize} messages queued`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        </Alert>
      </Snackbar>

      {/* Reconnecting Alert */}
      <Snackbar
        open={showReconnectingAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: showOfflineAlert ? 16 : 8 }}
      >
        <Alert
          severity="info"
          variant="filled"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleRetryConnection}
              startIcon={<Refresh />}
            >
              Retry
            </Button>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              {connectionState === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
            </Typography>
            {stats.reconnectAttempts > 0 && (
              <Typography variant="caption">
                Attempt {stats.reconnectAttempts}/10
              </Typography>
            )}
            <LinearProgress
              size="small"
              sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }}
            />
          </Box>
        </Alert>
      </Snackbar>

      {/* Offline Queue Management */}
      {stats.offlineQueueSize > 0 && (isOnline || isConnected) && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1300,
            minWidth: 300,
            maxWidth: 400
          }}
        >
          <Alert
            severity="info"
            variant="outlined"
            sx={{ bgcolor: 'background.paper' }}
            action={
              <Button
                size="small"
                onClick={handleProcessQueue}
                startIcon={<Sync />}
                disabled={!isConnected}
              >
                Sync Now
              </Button>
            }
          >
            <Box>
              <Typography variant="body2" fontWeight="bold">
                Offline Messages Ready to Sync
              </Typography>
              <Typography variant="caption">
                {stats.offlineQueueSize} messages waiting
              </Typography>
            </Box>
          </Alert>
        </Box>
      )}

      {/* Connection Restored Notification */}
      {isOnline && isConnected && stats.offlineQueueSize === 0 && stats.lastSyncTime && (
        <Snackbar
          open={Date.now() - stats.lastSyncTime < 5000} // Show for 5 seconds after sync
          autoHideDuration={3000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" variant="filled">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle />
              <Typography variant="body2">
                Connection restored and all messages synced
              </Typography>
            </Box>
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

export default OfflineIndicator;
