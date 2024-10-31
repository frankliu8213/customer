async function loadCategories() {
    const response = await fetch('/api/get-categories');
    const data = await response.json();
    return data;
}

function renderCategories(categories, parentId = '', level = 1) {
    let html = '';
    const levelId = `level${level}`;

    for (const [key, value] of Object.entries(categories)) {
        const currentId = parentId ? `${parentId}-${levelId}-${key}` : `${levelId}-${key}`;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
            html += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading${currentId}">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" 
                                data-bs-target="#collapse${currentId}" 
                                aria-expanded="true" 
                                aria-controls="collapse${currentId}">
                            ${key}
                        </button>
                    </h2>
                    <div id="collapse${currentId}" 
                         class="accordion-collapse show" 
                         aria-labelledby="heading${currentId}" 
                         data-bs-parent="#accordion-${levelId}-${parentId}">
                        <div class="accordion-body">
                            <div class="accordion" id="accordion-${levelId}-${currentId}">
                                ${renderCategories(value, currentId, level + 1)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else if (Array.isArray(value)) {
            html += `
                <div class="ms-3">
                    <strong>${key}</strong>
                    <div class="ms-3">
                        ${value.map(item => `
                            <div>
                                <label>
                                    <input type="checkbox" name="options" value="${item}" 
                                           ${value.length === 1 ? 'checked' : ''}>
                                    ${item}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    return html;
}

window.addEventListener('load', async () => {
    const categories = await loadCategories();
    document.querySelector('#accordion-root').innerHTML = renderCategories(categories);
}); 