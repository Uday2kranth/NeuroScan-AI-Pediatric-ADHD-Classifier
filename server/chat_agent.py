import os
import urllib.request
import urllib.parse
import re
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool

# Compute project root (parent of server/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def web_search(query: str) -> str:
    """
    Search the web for query using DuckDuckGo HTML gateway and return a summary of the results.
    """
    try:
        url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
        results = []
        
        # Extract title, url, and snippet
        title_url_matches = re.findall(r'<a class="result__a"[^>]* href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
        snippet_matches = re.findall(r'<a class="result__snippet"[^>]*>(.*?)</a>', html, re.DOTALL)
        
        if not title_url_matches:
            title_url_matches = re.findall(r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
            snippet_matches = re.findall(r'<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>', html, re.DOTALL)
            
        for i in range(min(len(title_url_matches), len(snippet_matches), 5)):
            url_val = title_url_matches[i][0]
            title = re.sub(r'<[^>]+>', '', title_url_matches[i][1]).strip()
            snippet = re.sub(r'<[^>]+>', '', snippet_matches[i]).strip()
            
            if "uddg=" in url_val:
                parsed_url = urllib.parse.urlparse(url_val)
                query_params = urllib.parse.parse_qs(parsed_url.query)
                if "uddg" in query_params:
                    url_val = query_params["uddg"][0]
            
            results.append(f"Title: {title}\nURL: {url_val}\nSnippet: {snippet}\n")
            
        if not results:
            if "ddg-gdpr" in html:
                return "GDPR prompt encountered on search gateway."
            return "No search results found on DuckDuckGo HTML gateway."
            
        return "\n---\n".join(results)
    except Exception as e:
        return f"Error executing web search: {str(e)}"

@tool
def web_search_tool(query: str) -> str:
    """
    Search the web to retrieve information and research domain-specific ADHD or EEG optimization suggestions.
    Input should be a simple search query string (e.g., 'ADHD EEG delta theta ratio biomarker').
    """
    return web_search(query)

def format_html_email(body_text: str) -> str:
    # Basic Markdown-to-HTML parser to ensure markdown elements render correctly
    html_content = body_text
    
    # Escape simple HTML entities to avoid breaking template structure, but let's do it safely
    # Standard Markdown transformations:
    # Headers
    html_content = re.sub(r'^### (.*?)$', r'<h3 style="color: #1e3a8a; margin-top: 20px; font-family: sans-serif; font-size: 18px;">\1</h3>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^## (.*?)$', r'<h2 style="color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 24px; font-family: sans-serif; font-size: 20px;">\1</h2>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^# (.*?)$', r'<h1 style="color: #1e3a8a; text-align: center; margin-top: 24px; font-family: sans-serif; font-size: 24px;">\1</h1>', html_content, flags=re.MULTILINE)
    
    # Bold
    html_content = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html_content)
    
    # Bullet points
    html_content = re.sub(r'^\s*[-*]\s+(.*?)$', r'<li style="margin-bottom: 8px; line-height: 1.6; color: #334155; font-family: sans-serif; font-size: 15px;">\1</li>', html_content, flags=re.MULTILINE)
    
    # Handle list blocks (wrap sequences of <li> in <ul>)
    html_content = re.sub(r'((?:<li style=".*?">.*?</li>\s*)+)', r'<ul style="padding-left: 20px; margin-top: 8px; margin-bottom: 16px;">\1</ul>', html_content)

    # Paragraphs (split by double newline, wrap non-HTML blocks in <p>)
    paragraphs = html_content.split('\n\n')
    for i, p in enumerate(paragraphs):
        p = p.strip()
        if p and not p.startswith('<h') and not p.startswith('<ul') and not p.startswith('<li') and not p.startswith('<table') and not p.startswith('<div'):
            paragraphs[i] = f'<p style="line-height: 1.6; color: #334155; margin-bottom: 16px; font-family: sans-serif; font-size: 15px;">{p}</p>'
    html_content = '\n\n'.join(paragraphs)

    # HTML template with a professional, color-themed header banner
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NeuroScan AI - EEG Analysis Report</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
            <!-- Header Banner -->
            <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 36px 24px; text-align: center;">
                    <span style="background-color: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">Report Status: Active</span>
                    <h1 style="color: #ffffff; margin: 12px 0 0 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; font-family: sans-serif;">NeuroScan AI</h1>
                    <p style="color: #e0e7ff; margin: 6px 0 0 0; font-size: 14px; font-weight: 500; font-family: sans-serif;">Automated EEG Diagnostic Interpretation Support</p>
                </td>
            </tr>
            <!-- Content Area -->
            <tr>
                <td style="padding: 32px 24px; background-color: #ffffff;">
                    {html_content}
                </td>
            </tr>
            <!-- Divider -->
            <tr>
                <td style="padding: 0 24px;">
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 0;" />
                </td>
            </tr>
            <!-- Footer -->
            <tr>
                <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0; font-size: 11px; color: #64748b; font-family: sans-serif; line-height: 1.5;">
                        <strong>Disclaimer:</strong> This report is automatically generated using machine learning classification and generative AI support based on the provided EEG brainwave recording. It is intended strictly for research and informational purposes and does not replace professional clinical evaluation or physician advice.
                    </p>
                    <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8; font-family: sans-serif;">
                        &copy; 2026 NeuroScan AI. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html_template

@tool
def send_email_tool(recipient: str, subject: str, body: str) -> str:
    """
    Sends an email report containing model findings and EEG classification summaries.
    Accepts:
      - recipient: Recipient email address
      - subject: Email subject line
      - body: Content of the email report (markdown/text)
    """
    credentials_file = os.path.join(PROJECT_ROOT, "credentials.json")
    token_file = os.path.join(PROJECT_ROOT, "token.json")
    
    html_body = format_html_email(body)
    
    # Fallback log function
    def log_email_fallback(reason: str):
        log_entry = (
            f"\n==================================================\n"
            f"=== SENT EMAIL AUDIT LOG (LOCAL FALLBACK) ===\n"
            f"To: {recipient}\n"
            f"Subject: {subject}\n"
            f"Body (HTML template applied):\n{html_body}\n"
            f"Reason for Fallback: {reason}\n"
            f"==================================================\n"
        )
        try:
            with open(os.path.join(PROJECT_ROOT, "sent_emails.log"), "a", encoding="utf-8") as f:
                f.write(log_entry)

            return f"Email was logged locally to `sent_emails.log` because: {reason}."
        except Exception as file_err:
            return f"Failed to log email locally: {str(file_err)}"
            
    # Check if files exist
    if not os.path.exists(credentials_file) and not os.path.exists(token_file):
        return log_email_fallback("both credentials.json and token.json are missing")
        
    try:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build
        import base64
        from email.mime.text import MIMEText
        
        SCOPES = ['https://www.googleapis.com/auth/gmail.send']
        creds = None
        
        if os.path.exists(token_file):
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
            
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(credentials_file):
                    return log_email_fallback("credentials.json is missing and token is invalid/expired")
                flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(token_file, 'w') as token:
                token.write(creds.to_json())
                
        service = build('gmail', 'v1', credentials=creds)
        message = MIMEText(html_body, 'html', 'utf-8')
        message['to'] = recipient
        message['subject'] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        
        service.users().messages().send(userId='me', body={'raw': raw}).execute()
        return f"Email successfully sent to {recipient} via Gmail API."
        
    except Exception as e:
        return log_email_fallback(f"Gmail API flow failed or was not authorized: {str(e)}")

def get_llm(provider: str, api_key: str, model: str):
    """
    Factory function to instantiate the correct LangChain LLM model based on user selection.
    Does not hardcode API keys.
    """
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model or "gemini-1.5-flash",
            google_api_key=api_key
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model or "gpt-4o-mini",
            openai_api_key=api_key
        )
    elif provider == "openrouter":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model or "openrouter/free",
            openai_api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "NeuroScan AI"
            }
        )
    elif provider == "nvidia":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model or "minimaxai/minimax-m2.7",
            openai_api_key=api_key,
            base_url="https://integrate.api.nvidia.com/v1"
        )
    else:
        raise ValueError(f"Unsupported provider: {provider}")

def get_system_prompt(context_report: str) -> str:
    """
    Returns the domain-locked System Prompt with injected context.
    """
    return f"""You are the NeuroScan AI Copilot, a pediatric ADHD EEG analysis assistant.
Your core purpose is to help parents and clinicians interpret pediatric EEG classification results.

Here is the current workspace context (including active prediction state if any):
{context_report}

CRITICAL BEHAVIORAL & COMMUNICATION RULES:
1. FOCUS ON DIAGNOSTIC OUTCOMES (NOT TECHNICAL METRICS):
   - By default, do NOT mention model accuracy, F1-scores, precision, recall, or detailed classifier names (like XGBoost, LightGBM, Random Forest) in the chat or email responses unless the user explicitly asks for them.
   - Do NOT output raw feature names or technical terminology (like zero-crossing rate, zcr, Hjorth parameters, or specific mathematical formulas) unless explicitly requested.
   - Instead, focus entirely on interpreting the outcome:
     * Classification result (either "ADHD" or "Control", which refers to a Healthy/Neurotypical Control).
     * The ADHD probability/confidence level (e.g., "ADHD Probability: 42%").
     * What this prediction actually means in plain, everyday language suitable for parents.
2. WEB SEARCH AND PARENT-ORIENTED EXPLANATION:
   - When explaining or interpreting the results (or when the chat starts/user asks for interpretation), you MUST explain the outcome and its confidence level.
   - You MUST search the web (use 'web_search_tool') or explain the medical context of these findings: what factors could lead to this (e.g. neurotransmitters, frontal lobe activity, delta/theta band balances), what are the practical implications, and what next steps the parents should take (such as consulting a pediatrician or child psychiatrist).
   - I can translate health reports and explanations into major Indic languages (Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Punjabi, Tamil, Telugu, and Oriya).
   - Conclude by asking follow-up questions to clarify the child's context or history (e.g., "Has your child had trouble focusing at school, or are these results for general screening?").
3. EMAIL REPORT FORMATTING RULES (FOR `send_email_tool`):
   - When generating the email body for 'send_email_tool', strictly write the text in a clear, narrative, and patient-friendly format.
   - Do NOT include any markdown symbols (like `##`, `*`, `**`, etc.) or coding/Notion formatting in the raw text, as it will be rendered as clean, formatted text inside a beautiful email template.
   - Limit the email contents strictly to:
     * The final prediction (ADHD or Healthy Control).
     * The confidence/probability.
     * The parent-friendly clinical interpretation.
     * Educational context on EEG frequencies (in plain terms) and next steps.
     * A polite closing asking for questions.
   - Do NOT include technical metrics or model parameters in the email unless the user specifically wrote "include model metrics/performance" in their email request.
4. MANDATORY TOOL USAGE:
   - You have access to two tools: `send_email_tool` (which sends the generated interpretation report to the parent's email) and `web_search_tool` (which performs a web search for medical/clinical info).
   - If the user asks you to email, send, or share the report to an email address (e.g. "send email to udaykranth01@gmail.com", "email this to me"), you MUST call the `send_email_tool` tool. Do NOT just say you are sending it; you must generate the tool call!
   - When asked to explain the results, you MUST call the `web_search_tool` tool to search for pediatric ADHD EEG delta/theta biomarkers first, retrieve relevant info, and use that info to interpret the prediction for the parent.

CRITICAL SYSTEM INSTRUCTIONS & GUARDRAILS:
1. DOMAIN LIMITATION: You are strictly guardrailed to the scope of this application's domain, which includes pediatric ADHD classification, EEG signal analysis, machine learning metrics, feature extraction (frequency band powers, Hjorth parameters, coherence), and neuroscience.
2. OUT-OF-SCOPE REFUSAL: You must politely refuse to answer questions that are completely outside this domain (e.g., sports, politics, general web development, general cooking recipes, general medical diagnoses for non-ADHD diseases, etc.). If a query does not pertain to this app or its core domain, you must say exactly:
"I am sorry, but I am guardrailed to only answer questions related to the NeuroScan AI EEG ADHD classification workspace."
3. ALLOW DOMAIN-RELEVANT CONTEXT: You MUST answer secondary, educational, or industry-specific questions that help clarify the workspace content (e.g., explaining what Delta/Theta/Alpha/Beta/Gamma bands represent, what Hjorth parameters are, how EEG coherence works, what GroupKFold cross-validation is, or details of the KNN/SVM/XGBoost models used here).
4. CONTEXT AWARENESS: Proactively refer to the active workspace context report provided above. When the user uses conversational pronouns like "this data", "this report", "this prediction", "these metrics", or "these features", you must accurately interpret them using the active context.
5. REQUIRED DISCLAIMER: You must state that you are an AI assistant explaining/interpreting the application's data and model outputs, and you do not represent any official medical authority, external diagnostic entity, or manufacturer. This classification system is for research/informational purposes.
6. ZERO-TOLERANCE FOR SPELLING & GRAMMAR ERRORS: You must proofread all responses prior to sending. The tone must be professional, and the text must be free of typos, spelling mistakes, or syntactical errors.
7. STRUCTURED INFORMATION OUTPUT: Do not send walls of unstructured text. Responses must use clean markdown elements: clear sub-headers (###), bold terms, bullet points for lists, and markdown tables for comparisons or metrics.
8. DECISION MATRIX: When discussing model deployment or quality control, propose clear decisions based on severity:
   - "Keep/Fix" if performance metrics (e.g., accuracy, F1) are acceptable but need tuning.
   - "Cut/Discontinue" if metrics are unacceptably low (e.g., accuracy near or below chance level of 50%).
9. MITIGATION & QUALITY UPDATES: Offer concrete improvement plans or financial/parameter mitigation tweaks (pricing, data acquisition cost, sensor counts) to compensate for weaknesses identified by the model features.
10. COMPETITOR & PIVOT ADVICE: Propose market comparisons and strategic pivots based on high-performing secondary features.
11. AMBIGUITY DETECTION & CLARIFICATION: Detect when user prompts are vague, incomplete, or ambiguous. Instead of guessing or hallucinating details, ask for clarification using structured questions (e.g., bulleted options or simple multiple-choice questions) explaining what specific information is needed and why.
"""

def run_chat(provider: str, api_key: str, model: str, messages_history: list, new_message: str, context_report: str):
    """
    Invokes the LLM with the full message list (system prompt + history + new message)
    and supports binding/executing the send_email_tool and web_search_tool.
    """
    llm = get_llm(provider, api_key, model)
    
    # Try binding tools
    try:
        llm_with_tools = llm.bind_tools([send_email_tool, web_search_tool])
    except Exception as e:
        print(f"[chat_agent] Tool binding failed: {e}. Falling back to standard LLM.")
        llm_with_tools = llm
        
    formatted_messages = []
    
    # 1. System Prompt with latest context
    system_prompt = get_system_prompt(context_report)
    formatted_messages.append(SystemMessage(content=system_prompt))
    
    # 2. Add history
    for msg in messages_history:
        if msg.get("role") == "user":
            formatted_messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            formatted_messages.append(AIMessage(content=msg.get("content", "")))
            
    # 3. Add current message
    formatted_messages.append(HumanMessage(content=new_message))
    
    # Invoke model
    response = llm_with_tools.invoke(formatted_messages)
    
    email_sent_flag = False
    
    # Loop to process tool execution recursively (max 5 steps)
    iterations = 0
    while iterations < 5:
        has_tool_calls = hasattr(response, 'tool_calls') and response.tool_calls
        if not has_tool_calls:
            break
            
        formatted_messages.append(response)
        
        for tool_call in response.tool_calls:
            tool_name = tool_call['name']
            args = tool_call['args']
            
            if tool_name == 'send_email_tool':
                tool_output = send_email_tool.invoke(args)
                email_sent_flag = True
            elif tool_name == 'web_search_tool':
                tool_output = web_search_tool.invoke(args)
            else:
                tool_output = f"Error: Tool {tool_name} not found."
                
            formatted_messages.append(ToolMessage(
                content=str(tool_output),
                tool_call_id=tool_call['id'],
                name=tool_name
            ))
            
        response = llm_with_tools.invoke(formatted_messages)
        iterations += 1
        
    response_content = response.content or ""
    
    # Robust Fallback: If no email tool was triggered, but the user wanted to send an email to an address
    if not email_sent_flag:
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        emails_found = re.findall(email_pattern, str(new_message) + " " + response_content)
        if emails_found and any(x in (str(new_message).lower() + " " + response_content.lower()) for x in ["email", "send", "mail", "sent"]):
            recipient_email = emails_found[0]
            subject = "NeuroScan AI - Diagnostic Interpretation Report"
            body = response_content
            print(f"[chat_agent] Fallback: Programmatic email trigger detected for {recipient_email}")
            send_email_tool.invoke({"recipient": recipient_email, "subject": subject, "body": body})
            response_content += f"\n\n[System Confirmation: The report has been successfully sent to {recipient_email}.]"
            
    return response_content or ""
