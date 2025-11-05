import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta
from typing import List, Dict
import io

from config.settings import settings

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = settings.GMAIL_USER
        self.sender_password = settings.GMAIL_PASSWORD
    
    def send_email(
        self, 
        recipient: str, 
        subject: str, 
        html_content: str,
        attachments: List[Dict] = None
    ):
        """Send email with optional attachments"""
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = self.sender_email
            msg['To'] = recipient
            msg['Subject'] = subject
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    part = MIMEApplication(
                        attachment['data'],
                        Name=attachment['filename']
                    )
                    part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                    msg.attach(part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False
    
    def generate_expense_report_html(
        self, 
        user_name: str,
        period: str,
        total_amount: float,
        expenses_by_category: List[Dict],
        insights: Dict,
        currency: str = "INR"
    ) -> str:
        """Generate HTML report for expenses"""
        
        categories_html = ""
        for cat in expenses_by_category:
            categories_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{cat['_id']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    {currency} {cat['total']:.2f}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    {cat['count']}
                </td>
            </tr>
            """
        
        savings_tips_html = ""
        if insights.get('savings_tips'):
            for tip in insights['savings_tips']:
                savings_tips_html += f"<li style='margin: 8px 0;'>{tip}</li>"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 30px; text-align: center; border-radius: 8px; }}
                .content {{ background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px; }}
                .total {{ font-size: 32px; font-weight: bold; color: #667eea; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }}
                th {{ background: #667eea; color: white; padding: 12px; text-align: left; }}
                .insights {{ background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; 
                            margin: 20px 0; border-radius: 4px; }}
                .footer {{ text-align: center; color: #666; margin-top: 30px; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💰 Your {period.capitalize()} Expense Report</h1>
                    <p>Hi {user_name}!</p>
                </div>
                
                <div class="content">
                    <h2>Summary</h2>
                    <p>Total Spent: <span class="total">{currency} {total_amount:.2f}</span></p>
                    
                    <h3>Expenses by Category</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th style="text-align: right;">Amount</th>
                                <th style="text-align: right;">Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories_html}
                        </tbody>
                    </table>
                </div>
                
                <div class="insights">
                    <h3>🤖 AI Insights</h3>
                    <p><strong>Spending Pattern:</strong> {insights.get('spending_pattern', 'N/A')}</p>
                    <p><strong>Prediction:</strong> {insights.get('predicted_expenses', 'N/A')}</p>
                    
                    {f'''<h4>💡 Savings Tips:</h4>
                    <ul>{savings_tips_html}</ul>''' if savings_tips_html else ''}
                </div>
                
                <div class="footer">
                    <p>This is an automated report from your AI Expense Tracker</p>
                    <p>You can manage your email preferences in app settings</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html
    
    def send_budget_alert(
        self,
        recipient: str,
        user_name: str,
        budget_amount: float,
        current_spending: float,
        percentage: float,
        currency: str = "INR"
    ):
        """Send budget alert email"""
        subject = f"⚠️ Budget Alert: {percentage:.0f}% Used"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto;">
                <h2 style="color: #ff6b6b;">Budget Alert!</h2>
                <p>Hi {user_name},</p>
                <p>You've used <strong>{percentage:.1f}%</strong> of your budget.</p>
                <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p>Current Spending: <strong>{currency} {current_spending:.2f}</strong></p>
                    <p>Budget Limit: <strong>{currency} {budget_amount:.2f}</strong></p>
                    <p>Remaining: <strong>{currency} {budget_amount - current_spending:.2f}</strong></p>
                </div>
                <p>Consider reviewing your expenses to stay within budget!</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(recipient, subject, html)