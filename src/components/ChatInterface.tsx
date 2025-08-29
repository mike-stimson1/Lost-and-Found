import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import type { ChatMessage } from '../types/chat';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onClearError: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearError
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {error && (
        <Alert 
          severity="error" 
          onClose={onClearError}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          mb: 2,
          pr: 1
        }}
      >
        {messages.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              textAlign: 'center'
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Ask me about Australian government datasets!<br/>
              For example: "Show me datasets about employment statistics" or "What data is available on housing prices?"
            </Typography>
          </Box>
        ) : (
          messages.map((message) => (
            <Paper
              key={message.id}
              elevation={1}
              sx={{
                p: 2,
                mb: 2,
                ml: message.role === 'user' ? 4 : 0,
                mr: message.role === 'assistant' ? 4 : 0,
                bgcolor: message.role === 'user' 
                  ? 'primary.light' 
                  : 'background.default',
                color: message.role === 'user' 
                  ? 'primary.contrastText' 
                  : 'text.primary'
              }}
            >
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
              {message.isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              )}
            </Paper>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Paper 
        component="form" 
        onSubmit={handleSubmit}
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          gap: 1
        }}
      >
        <TextField
          ref={inputRef}
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="Ask about Australian government datasets..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              '& fieldset': { border: 'none' }
            }
          }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!inputValue.trim() || isLoading}
          sx={{ 
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': {
              bgcolor: 'primary.dark'
            },
            '&.Mui-disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Paper>
    </Box>
  );
};

export default ChatInterface;