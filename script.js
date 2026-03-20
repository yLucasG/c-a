const { createApp, ref, computed, onMounted, reactive } = Vue;

createApp({
    setup() {
        // --- ESTADO GLOBAL (STATE) ---
        const session = reactive({ isLoggedIn: false, pwd: '', currentCia: '1ª CIA', dataVersion: 0 });
        
        const ui = reactive({ 
            menuOpen: false, 
            currentView: 'dashboard', 
            search: '', 
            viewMode: 'grid', 
            filters: { pelotao: '', plantao: '', alojamento: '' } 
        });
        
        const modals = reactive({
            record: { show: false, category: '', student: null },
            history: { show: false, student: null },
            rewards: { show: false }
        });
        
        const forms = reactive({
            record: { tipo: 'FO+', motivo: '', data: new Date().toISOString().split('T')[0], oficial: 'Ten Cel Comandante', customOficial: '', sei: '' },
            report: { date: new Date().toISOString().split('T')[0], auxiliar: '', adjunto: '', data: { punishments: [], neg: [], pos: [] } }
        });
        
        const isImprovingText = ref(false);

        // --- DADOS BASE ---
        const lists = reactive({ 
            officers: ['Ten Cel Comandante', 'Maj Subcomandante', 'Cap Cmt CIA', 'Ten Oficial de Dia', 'Outro'] 
        });

        // Banco de dados simulado inicial (Efetivo)
        const students = ref([
            { id: 1, nome: 'AL OF PM SILVA', numero: '01', pelotao: '1º Pelotão', cia: '1ª CIA', plantao: 'ALFA', alojamento: 'Alpha', history: [] },
            { id: 2, nome: 'AL OF PM OLIVEIRA', numero: '02', pelotao: '1º Pelotão', cia: '1ª CIA', plantao: 'BRAVO', alojamento: 'Alpha', history: [] },
            { id: 3, nome: 'AL OF PM SANTOS', numero: '03', pelotao: '2º Pelotão', cia: '1ª CIA', plantao: 'CHARLIE', alojamento: 'Bravo', history: [] },
            { id: 4, nome: 'AL OF PM SOUZA', numero: '04', pelotao: '1º Pelotão', cia: '2ª CIA', plantao: 'DELTA', alojamento: 'Alpha', history: [] },
            { id: 5, nome: 'AL OF PM LIMA', numero: '05', pelotao: '2º Pelotão', cia: '1ª CIA', plantao: 'ALFA', alojamento: 'Bravo', history: [] },
            { id: 6, nome: 'AL OF PM COSTA', numero: '06', pelotao: '1º Pelotão', cia: '1ª CIA', plantao: 'BRAVO', alojamento: 'Alpha', history: [] },
        ]);

        // --- LÓGICA DE BANCO DE DADOS LOCAL ---
        const loadData = () => {
            const data = localStorage.getItem('siga_pro_apmp_data');
            if (data) {
                students.value = JSON.parse(data);
            }
        };

        const saveData = () => {
            localStorage.setItem('siga_pro_apmp_data', JSON.stringify(students.value));
            session.dataVersion++; // Força atualização reativa
        };

        onMounted(() => { loadData(); });

        // --- COMPUTED PROPERTIES (Filtros e Cálculos Automáticos) ---
        const filteredStudents = computed(() => {
            return students.value.filter(s => {
                if (s.cia !== session.currentCia) return false;
                if (ui.search && !s.nome.toLowerCase().includes(ui.search.toLowerCase()) && !s.numero.includes(ui.search)) return false;
                if (ui.filters.pelotao && s.pelotao !== ui.filters.pelotao) return false;
                if (ui.filters.plantao && s.plantao !== ui.filters.plantao) return false;
                if (ui.filters.alojamento && s.alojamento !== ui.filters.alojamento) return false;
                return true;
            });
        });

        const uniquePelotoes = computed(() => [...new Set(students.value.filter(s => s.cia === session.currentCia).map(s => s.pelotao))].sort());
        const hasFilters = computed(() => ui.filters.pelotao || ui.filters.plantao || ui.filters.alojamento);

        // --- SISTEMA DE PONTUAÇÃO ---
        const getCycleScore = (student) => {
            if(!student || !student.history) return 0;
            let score = 0;
            student.history.forEach(h => {
                if (h.type === 'FO+') score += 1;
                if (h.type === 'FO-') score -= 1;
                if (h.type === 'MEDIDA_LEVE') score -= 2;
                if (h.type === 'MEDIDA_MEDIA') score -= 3;
                if (h.type === 'MEDIDA_GRAVE') score -= 4;
                if (h.type === 'PUNICAO') score -= 5;
            });
            return score;
        };

        const getRawScore = (student) => student.history.filter(h => h.type === 'FO+').length;
        const getNegCount = (student) => student.history.filter(h => h.type !== 'FO+').length;

        // --- MÉTODOS DE INTERFACE E ESTILO ---
        const getBorderClass = (student) => {
            const score = getCycleScore(student);
            if (score >= 5) return 'border-green-500';
            if (score < 0) return 'border-red-500';
            return 'border-blue-500';
        };

        const getBorderColor = (type) => {
            if (type === 'FO+') return 'border-green-500';
            if (['FO-', 'MEDIDA_LEVE', 'MEDIDA_MEDIA', 'MEDIDA_GRAVE', 'PUNICAO'].includes(type)) return 'border-red-500';
            return 'border-gray-500';
        };

        const getEventLabel = (type) => {
            const labels = { 'FO+': 'FO Positivo', 'FO-': 'FO Negativo', 'MEDIDA_LEVE': 'Medida Leve', 'MEDIDA_MEDIA': 'Medida Média', 'MEDIDA_GRAVE': 'Medida Grave', 'PUNICAO': 'Punição' };
            return labels[type] || type;
        };

        const formatDate = (dateStr) => {
            if(!dateStr) return '';
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        };

        // --- DADOS DO DASHBOARD ---
        const ciaStats = computed(() => {
            const ciaStuds = students.value.filter(s => s.cia === session.currentCia);
            let foPos = 0; let punishments = 0; let rewards = 0;
            let topPos = []; let topNeg = [];

            ciaStuds.forEach(s => {
                const score = getCycleScore(s);
                const rawPos = getRawScore(s);
                const negCount = getNegCount(s);
                
                s.history.forEach(h => {
                    if (h.type === 'FO+') foPos++;
                    if (['MEDIDA_LEVE', 'MEDIDA_MEDIA', 'MEDIDA_GRAVE', 'PUNICAO'].includes(h.type)) punishments++;
                });
                if (score >= 5) rewards++;

                if (rawPos > 0) topPos.push({ ...s, rawPos });
                if (negCount > 0) topNeg.push({ ...s, negCount });
            });

            topPos.sort((a, b) => b.rawPos - a.rawPos);
            topNeg.sort((a, b) => b.negCount - a.negCount);

            return {
                total: ciaStuds.length, foPos, punishments, rewards,
                topPos: topPos.slice(0, 5), topNeg: topNeg.slice(0, 5)
            };
        });

        // Agrupamento para modo "Canga"
        const cangaList = computed(() => {
            const arr = [];
            for (let i = 0; i < filteredStudents.value.length; i += 2) {
                arr.push({ id: i, s1: filteredStudents.value[i], s2: filteredStudents.value[i + 1] || null });
            }
            return arr;
        });

        const rewardList = computed(() => students.value.filter(s => s.cia === session.currentCia && getCycleScore(s) >= 5));

        // --- AÇÕES DO USUÁRIO ---
        const login = () => {
            if (session.pwd === 'admin' || session.pwd === 'APMP') {
                session.isLoggedIn = true;
            } else {
                alert('Acesso negado. Dica: use a senha "admin"');
            }
        };

        const resetDatabase = () => {
            if(confirm('ATENÇÃO: Isso apagará TODOS os registros de alterações locais. Tem certeza?')) {
                localStorage.removeItem('siga_pro_apmp_data');
                location.reload();
            }
        };

        const changeCia = (cia) => { session.currentCia = cia; };
        const navigate = (view) => { ui.currentView = view; ui.menuOpen = false; };
        const clearFilters = () => { ui.filters = { pelotao: '', plantao: '', alojamento: '' }; };

        const openModal = (student, category) => {
            modals.record.student = student;
            modals.record.category = category;
            forms.record.tipo = category === 'FO' ? 'FO+' : 'MEDIDA_LEVE';
            forms.record.motivo = '';
            forms.record.sei = '';
            modals.record.show = true;
        };

        const submitRecord = () => {
            const s = students.value.find(st => st.id === modals.record.student.id);
            if (s) {
                s.history.push({
                    type: forms.record.tipo,
                    motivo: forms.record.motivo,
                    data: forms.record.data,
                    oficial: forms.record.oficial === 'Outro' ? forms.record.customOficial : forms.record.oficial,
                    sei: forms.record.sei
                });
                saveData();
            }
            modals.record.show = false;
        };

        const openHistory = (student) => {
            modals.history.student = student;
            modals.history.show = true;
        };

        const deleteRecord = (student, idx) => {
            if (confirm('Deseja realmente apagar este registro disciplinar?')) {
                const s = students.value.find(st => st.id === student.id);
                if (s) {
                    s.history.splice(idx, 1);
                    saveData();
                }
            }
        };

        const openRewardsModal = () => { modals.rewards.show = true; };
        
        const claimReward = (student) => {
            if(confirm(`Conceder elogio para ${student.nome}? Isso consumirá os pontos positivos do ciclo.`)) {
                 const s = students.value.find(st => st.id === student.id);
                 if(s) {
                    // Remove os FO+ para "pagar" o elogio
                    s.history = s.history.filter(h => h.type !== 'FO+');
                    saveData();
                 }
            }
        };

        // --- RELATÓRIOS ---
        const generateReport = () => {
            const date = forms.report.date;
            const ciaStuds = students.value.filter(s => s.cia === session.currentCia);
            
            forms.report.data.punishments = [];
            forms.report.data.neg = [];
            forms.report.data.pos = [];

            ciaStuds.forEach(s => {
                s.history.forEach(h => {
                    if (h.data === date) {
                        const item = { studentName: s.nome, typeLabel: getEventLabel(h.type), reason: h.motivo, officer: h.oficial };
                        if (h.type === 'FO+') forms.report.data.pos.push(item);
                        else if (h.type === 'FO-') forms.report.data.neg.push(item);
                        else forms.report.data.punishments.push(item);
                    }
                });
            });
        };

        const enviarRelatorioWhatsApp = () => {
            let text = `*RELATÓRIO DIÁRIO DE ALTERAÇÕES - ${session.currentCia}*\n*Data:* ${formatDate(forms.report.date)}\n`;
            if(forms.report.auxiliar) text += `*Auxiliar de Dia:* ${forms.report.auxiliar}\n`;
            if(forms.report.adjunto) text += `*Adjunto:* ${forms.report.adjunto}\n\n`;

            if(forms.report.data.punishments.length) {
                text += `🛑 *ALTERAÇÕES DISCIPLINARES:*\n`;
                forms.report.data.punishments.forEach(i => text += `- ${i.studentName} (${i.typeLabel}): ${i.reason} [Oficial: ${i.officer}]\n`);
                text += `\n`;
            }
            if(forms.report.data.neg.length || forms.report.data.pos.length) {
                text += `📋 *FATOS OBSERVADOS:*\n`;
                forms.report.data.neg.forEach(i => text += `- [NEG] ${i.studentName}: ${i.reason} [Oficial: ${i.officer}]\n`);
                forms.report.data.pos.forEach(i => text += `- [POS] ${i.studentName}: ${i.reason} [Oficial: ${i.officer}]\n`);
            }

            if(!forms.report.data.punishments.length && !forms.report.data.neg.length && !forms.report.data.pos.length) {
                text += `_Sem alterações disciplinares ou fatos observados registrados para a data solicitada._`;
            }

            const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        };

        const melhorarTextoComIA = () => {
            if(!forms.record.motivo) {
                alert("Digite algum texto primeiro para a IA melhorar.");
                return;
            }
            isImprovingText.value = true;
            // Simulação de chamada de API para reescrever em jargão militar
            setTimeout(() => {
                forms.record.motivo = forms.record.motivo.trim() + " (Fato presenciado e registrado conforme as diretrizes disciplinares.)";
                isImprovingText.value = false;
            }, 1200);
        };

        // Expõe tudo para o HTML
        return {
            session, ui, modals, forms, lists, students, isImprovingText,
            filteredStudents, uniquePelotoes, hasFilters, ciaStats, cangaList, rewardList,
            login, resetDatabase, changeCia, navigate, clearFilters,
            openModal, submitRecord, openHistory, deleteRecord, openRewardsModal, claimReward,
            generateReport, enviarRelatorioWhatsApp, melhorarTextoComIA,
            getCycleScore, getRawScore, getNegCount, getBorderClass, getBorderColor, getEventLabel, formatDate
        };
    }
}).mount('#app');
