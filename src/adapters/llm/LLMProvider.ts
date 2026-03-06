export interface LLMMessage {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    name?: string;     // For tool calls/responses
    tool_call_id?: string;
    tool_calls?: LLMToolCall[];
}

export interface LLMToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: any; // JSON schema
    };
}

export interface LLMProvider {
    chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMMessage>;
}
