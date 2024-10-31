async function loadResult() {
    const response = await fetch('/api/get-result');
    const data = await response.json();
    
    const content = document.getElementById('result-content');
    content.innerHTML = `
        <p><strong>客户姓名：</strong>${data.customerName}</p>
        <p><strong>客户观念分型：</strong>${data.customerType}</p>
        <p><strong>客户分析及策略：</strong></p>
        <ul>
            ${data.selectedOptions.map(option => `<li>${option}</li>`).join('')}
        </ul>
    `;
}

window.addEventListener('load', loadResult); 