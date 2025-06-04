import MemoryClient from 'mem0ai'

const apiKey = import.meta.env.MEM0AI_API_KEY

if (!apiKey) {
  // In a server-side environment or build process, you might throw an error.
  // In a client-side environment, you might log a warning or disable features.
  console.error(
    'MEM0AI_API_KEY is not defined in environment variables. Mem0ai features may be unavailable.',
  )
  // Potentially throw new Error("MEM0AI_API_KEY is not defined in environment variables.");
}

// Initialize the client, but handle the case where apiKey might be undefined
// if you want the application to continue running in environments without the key.
const mem0aiClient = apiKey ? new MemoryClient({ apiKey }) : null

export default mem0aiClient

// Example of how you might export functions that use the client,
// ensuring they handle the possibility of the client not being initialized.
export async function getMemory(id: string) {
  if (!mem0aiClient) {
    console.warn('Mem0ai client is not initialized. Cannot fetch memory.')
    return null
  }
  try {
    // Replace with actual client method, e.g., mem0aiClient.get({ id });
    return await mem0aiClient.get(id)
  } catch (error) {
    console.error('Error fetching memory from Mem0ai:', error)
    throw error
  }
}

interface Message {
  role: string
  content: string
}

interface AddMessagesOptions {
  user_id: string
  // Include other potential fields from the SDK's options if known
  // e.g., session_id?: string;
}

interface CreateMemoryInput {
  messages: Message[]
  options: AddMessagesOptions
}

export async function createMemory(data: CreateMemoryInput) {
  if (!mem0aiClient) {
    console.warn('Mem0ai client is not initialized. Cannot create memory.')
    return null
  }
  try {
    // Replace with actual client method, e.g., mem0aiClient.create(data);
    return await mem0aiClient.add(data.messages, data.options)
  } catch (error) {
    console.error('Error creating memory with Mem0ai:', error)
    throw error
  }
}

// Add other mem0ai related functions here, always checking if mem0aiClient is initialized.

interface Message {
  role: string
  content: string
}

interface AddMessagesOptions {
  user_id: string
  // Include other potential fields from the SDK's options if known
  // e.g., session_id?: string;
}

export async function addMessagesToMemory(
  messages: Message[],
  options: AddMessagesOptions,
) {
  if (!mem0aiClient) {
    console.warn(
      'Mem0ai client is not initialized. Cannot add messages to memory.',
    )
    return null
  }
  try {
    const response = await mem0aiClient.add(messages, options)
    console.log('Successfully added messages to memory:', response)
    return response
  } catch (error) {
    console.error('Error adding messages to memory with Mem0ai:', error)
    // It's often better to throw the error or return a more specific error object
    // than to just log it and return null, depending on how the caller needs to react.
    throw error
  }
}
