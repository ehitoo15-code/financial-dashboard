import { showToast } from './modal.js';
import { icons } from './icons.js';

export function renderData(container, excelData, store) {
    container.innerHTML = `
        <div class="section-header">
            <h1 class="section-title">데이터 관리 및 보안</h1>
            <p class="section-subtitle">대시보드 데이터를 안전하게 백업하거나 복구합니다.</p>
        </div>

        <div class="dm-list animate-in">
            <div class="card dm-card">
                <div class="dm-info">
                    <div class="dm-icon" style="background:rgba(49,130,246,0.1);color:#3182f6">${icons.save()}</div>
                    <div class="dm-text">
                        <div class="dm-title">데이터 백업 (내보내기)</div>
                        <p class="dm-desc">현재 브라우저에 저장된 모든 기록을 JSON 파일로 저장합니다. 주기적으로 백업하는 것을 권장합니다.</p>
                    </div>
                </div>
                <button id="btn-export" class="btn btn-primary dm-btn">내 컴퓨터에 백업 파일 저장</button>
            </div>

            <div class="card dm-card">
                <div class="dm-info">
                    <div class="dm-icon" style="background:rgba(108,92,231,0.1);color:#6c5ce7">${icons.folder()}</div>
                    <div class="dm-text">
                        <div class="dm-title">데이터 복구 (불러오기)</div>
                        <p class="dm-desc">이전에 백업한 JSON 파일을 선택하여 데이터를 복원합니다. <strong>주의: 현재 데이터가 덮어씌워집니다.</strong></p>
                    </div>
                </div>
                <input type="file" id="file-import" style="display:none" accept=".json">
                <button id="btn-import-trigger" class="btn btn-neutral dm-btn">백업 파일 선택 및 복구</button>
            </div>

            <div class="card dm-card">
                <div class="dm-info">
                    <div class="dm-icon" style="background:rgba(255,71,87,0.1);color:#ff4757">${icons.alertTriangle()}</div>
                    <div class="dm-text">
                        <div class="dm-title text-danger">데이터 초기화</div>
                        <p class="dm-desc">모든 수정 사항을 지우고 초기 엑셀 파일 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다.</p>
                    </div>
                </div>
                <button id="btn-reset-excel" class="btn btn-danger dm-btn">초기화 실행</button>
            </div>
        </div>

        <div class="card dm-notice animate-in animate-delay-1">
            <div class="dm-info" style="align-items:flex-start">
                <div class="dm-icon" style="background:rgba(253,203,110,0.15);color:#f39c12">${icons.lock()}</div>
                <div class="dm-text">
                    <div class="dm-title">보안 및 저장 안내</div>
                    <ul class="dm-notice-list">
                        <li>데이터는 서버가 아닌 <strong>사용자 브라우저(LocalStorage)</strong>에만 저장되어 외부로 유출되지 않습니다.</li>
                        <li>브라우저 캐시 삭제 시 데이터가 소실될 수 있으니 반드시 백업 기능을 활용하세요.</li>
                        <li>GitHub에 코드를 올릴 때 개인 정보가 담긴 <code>data.xlsx</code> 파일이 포함되지 않도록 주의하세요.</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Export Logic
    document.getElementById('btn-export').addEventListener('click', () => {
        const data = store.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        a.href = url;
        a.download = `financial_backup_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('성공적으로 백업 파일을 생성했습니다.');
    });

    // Import Logic
    const fileInput = document.getElementById('file-import');
    document.getElementById('btn-import-trigger').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                if (confirm('데이터를 복구하시겠습니까? 현재 저장된 데이터는 삭제됩니다.')) {
                    store.importData(event.target.result);
                    showToast('데이터 복구가 완료되었습니다. 페이지를 새로고침합니다.');
                    setTimeout(() => location.reload(), 1500);
                }
            } catch (err) {
                alert('복구 실패: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    // Reset Logic
    document.getElementById('btn-reset-excel').addEventListener('click', () => {
        if (confirm('정말로 모든 데이터를 초기화하고 엑셀 파일 기준으로 되돌리시겠습니까?')) {
            store.resetFromExcel(excelData);
            showToast('초기화가 완료되었습니다.');
            setTimeout(() => location.reload(), 1000);
        }
    });
}
