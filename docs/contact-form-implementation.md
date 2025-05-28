# Production Contact Form Implementation

## Overview

This document describes the production-grade contact form implementation for Pixelated Empathy, replacing the previous placeholder with a fully functional system integrated with Resend email service.

## Architecture

### Components

1. **Frontend Form** (`src/pages/contact.astro`)
   - Real-time client-side validation
   - Loading states and error handling
   - Accessible form design with proper ARIA labels
   - Character counters and input constraints

2. **API Endpoint** (`src/pages/api/contact.ts`)
   - Server-side validation and sanitization
   - IP address extraction and logging
   - Error handling and response formatting
   - CORS preflight support

3. **Contact Service** (`src/lib/services/contact/ContactService.ts`)
   - Business logic and validation
   - Security checks and spam detection
   - Email template management
   - Integration with EmailService

4. **Email Templates**
   - Internal notification template (`templates/email/contact-form.html`)
   - User confirmation template (`templates/email/contact-confirmation.html`)

## Features

### Form Validation

#### Client-Side
- **Name**: 2-100 characters, letters/spaces/hyphens/apostrophes only
- **Email**: Valid email format, max 100 characters
- **Subject**: 3-200 characters
- **Message**: 10-2000 characters with character counter

#### Server-Side (Zod Schema)
```typescript
const ContactFormSchema = z.object({
  name: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-']+$/),
  email: z.string().email().max(100).toLowerCase(),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
})
```

### Security Features

#### Spam Detection
- Common spam keywords detection
- URL count limiting (max 2 URLs)
- Word repetition analysis
- Content diversity checks
- Rate limiting considerations (ready for Redis implementation)

#### Data Protection
- Input sanitization and validation
- SQL injection prevention
- XSS protection through proper escaping
- IP address logging for abuse tracking
- User agent tracking

### Email System

#### Queue-Based Processing
- Uses existing EmailService infrastructure
- Redis-based email queue
- Retry logic with exponential backoff
- Email delivery status tracking

#### Dual Email Flow
1. **Internal Notification** → `info@pixelatedempathy.com`
   - Contains all form data
   - Includes metadata (IP, User Agent, timestamp)
   - Reply-to set to user's email

2. **User Confirmation** → User's email address
   - Professional acknowledgment
   - Expected response time
   - Links to helpful resources
   - Social media links

## Implementation Details

### Frontend JavaScript Features

```typescript
// Real-time validation
function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required'
  if (email.length > 100) return 'Email must not exceed 100 characters'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}

// Loading state management
function setLoading(loading: boolean) {
  submitButton.disabled = loading
  submitText.textContent = loading ? 'Sending...' : 'Send Message'
  loadingSpinner.classList.toggle('hidden', !loading)
}
```

### API Response Format

```typescript
// Success Response
{
  success: true,
  message: "Your message has been sent successfully...",
  submissionId: "uuid-v4-string"
}

// Error Response
{
  success: false,
  message: "Specific error message for user"
}
```

### Email Template Variables

#### Contact Form Notification
- `{{name}}` - User's name
- `{{email}}` - User's email (clickable mailto link)
- `{{subject}}` - Message subject
- `{{message}}` - Full message content
- `{{timestamp}}` - Formatted submission time
- `{{userAgent}}` - Browser/device information
- `{{ipAddress}}` - Client IP address

#### User Confirmation
- `{{name}}` - User's name
- `{{subject}}` - Their subject line
- `{{timestamp}}` - Formatted submission time

## Configuration

### Environment Variables Required
- `RESEND_API_KEY` - Resend service API key
- `UPSTASH_REDIS_REST_URL` - Redis URL for email queue
- `UPSTASH_REDIS_REST_TOKEN` - Redis authentication token

### Email Settings
- **From Address**: `noreply@pixelatedempathy.com`
- **Internal Email**: `info@pixelatedempathy.com`
- **Template Aliases**:
  - `contact-form-notification`
  - `contact-confirmation`

## Testing

### Automated Tests
Location: `src/lib/services/contact/__tests__/ContactService.test.ts`

Test Coverage:
- ✅ Valid form submission
- ✅ Field validation (all fields)
- ✅ Email format validation
- ✅ Spam detection
- ✅ URL count limits
- ✅ Content diversity checks
- ✅ Error handling
- ✅ Email service integration
- ✅ Logging verification

### Manual Testing Script
Location: `scripts/test-contact-api.js`

Run with: `node scripts/test-contact-api.js`

## Monitoring & Observability

### Logging
- All submissions logged with context
- Error tracking with stack traces
- Performance metrics (response times)
- Security events (blocked submissions)

### Metrics Tracked
- Submission success/failure rates
- Response times
- Spam detection rates
- Email delivery status
- User engagement patterns

## Security Considerations

### Input Validation
- Multi-layer validation (client + server)
- Type checking and format validation
- Length restrictions on all fields
- Character encoding verification

### Rate Limiting
- Ready for Redis-based rate limiting
- IP-based submission tracking
- Configurable limits per time window

### Data Privacy
- Minimal data collection
- Secure data transmission (HTTPS)
- No sensitive data in logs
- GDPR compliance ready

## Performance

### Optimization Features
- Async email processing (queue-based)
- Client-side validation reduces server load
- Efficient database queries
- CDN-ready static assets

### Scalability
- Horizontal scaling ready
- Database connection pooling
- Redis cluster support
- Load balancer compatible

## Deployment

### Build Process
1. Email templates are loaded at startup
2. Templates registered with EmailService
3. ContactService initializes with validation
4. API endpoints expose functionality

### Health Checks
- Template loading verification
- Email service connectivity
- Redis queue status
- Database connectivity

## Future Enhancements

### Planned Features
- File attachment support
- Multi-language support
- Advanced spam filtering
- Integration with CRM systems
- Analytics dashboard
- A/B testing capabilities

### Technical Improvements
- GraphQL API option
- WebSocket real-time updates
- Advanced caching strategies
- Machine learning spam detection
- Automated response capabilities

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check Resend API key configuration
   - Verify email templates are loaded
   - Check Redis connectivity

2. **Validation errors**
   - Verify Zod schema matches frontend validation
   - Check character encoding issues
   - Review spam detection rules

3. **Performance issues**
   - Monitor Redis queue size
   - Check database connection pool
   - Review logging overhead

### Debug Commands
```bash
# Check email queue status
node -e "import('./src/lib/services/contact/ContactService.js').then(({ContactService}) => new ContactService().getQueueStats().then(console.log))"

# Test email templates
node scripts/test-contact-api.js

# Verify configuration
pnpm run typecheck
```

## Conclusion

This implementation provides a robust, secure, and scalable contact form solution that meets production requirements while maintaining excellent user experience and developer maintainability.