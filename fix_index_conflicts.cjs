const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const c1 = `<<<<<<< HEAD
=======
        function fetchTasks() {
            if (!currentUser || !currentUserData) return;
            if (unsubscribeTasks) unsubscribeTasks();

>>>>>>> origin/main`;
code = code.replace(c1, "");

const c2 = `<<<<<<< HEAD
                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                await manageTasks({
                    action: "create",
                    payload: {
                        title: title,
                        description: desc,
                        assignee: assignee,
                        priority: priority,
                        dueDate: dueDate
                    }
                });
                
                document.getElementById('taskTitle1').value = '';
                document.getElementById('taskDesc1').value = '';
                fetchTasks();

                btn.innerHTML = originalText;
                btn.disabled = false;
                lucide.createIcons();
            } catch (error) {
=======
                const taskData = {
                    title: title,
                    description: desc,
                    assignedTo: assigneeId,
                    assignedByName: currentUserData.name || "Manager",
                    assignedById: currentUser.uid,
                    orgId: currentUserData.orgId,
                    status: 'Pending',
                    priority: priority,
                    dueDate: dueDate,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await window.db.collection('tasks').add(taskData);
>>>>>>> origin/main`;
const r2 = `                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                await manageTasks({
                    action: "create",
                    payload: {
                        title: title,
                        description: desc,
                        assignee: assigneeId,
                        priority: priority,
                        dueDate: dueDate
                    }
                });
                
                document.getElementById('taskTitle1').value = '';
                document.getElementById('taskDesc1').value = '';
                fetchTasks();`;
code = code.replace(c2, r2);

const c3 = `<<<<<<< HEAD
            try {
                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                const result = await manageTasks({ action: "get", payload: {} });
=======
            unsubscribeTasks = window.db.collection('tasks')
                .where('orgId', '==', currentUserData.orgId)
                .onSnapshot(snap => {
                    activeTasksList = [];
                    snap.forEach(doc => activeTasksList.push({ id: doc.id, ...doc.data() }));
>>>>>>> origin/main`;
const r3 = `            try {
                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                const result = await manageTasks({ action: "get", payload: {} });`;
code = code.replace(c3, r3);

const c4 = `<<<<<<< HEAD
                }
            } catch (error) {
                console.error("Error fetching tasks:", error);
                if (container) {
                    container.innerHTML = \`<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load tasks: \${window.escapeHTML ? window.escapeHTML(error.message) : error.message}</div>\`;
                }
            }
=======
                }, err => {
                    console.error("Error fetching tasks:", err);
                    container.innerHTML = '';
                    const errDiv = document.createElement('div');
                    errDiv.className = 'text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center';
                    errDiv.textContent = \`Failed to load tasks: \${err.message}\`;
                    container.appendChild(errDiv);
                });
>>>>>>> origin/main`;
const r4 = `                }
            } catch (error) {
                console.error("Error fetching tasks:", error);
                if (container) {
                    container.innerHTML = \`<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">Failed to load tasks: \${window.escapeHTML ? window.escapeHTML(error.message) : error.message}</div>\`;
                }
            }`;
code = code.replace(c4, r4);

const c5 = `<<<<<<< HEAD
                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                await manageTasks({
                    action: "updateStatus",
                    payload: { taskId, status: newStatus }
=======
                await window.db.collection('tasks').doc(taskId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    orgId: currentUserData.orgId
>>>>>>> origin/main`;
const r5 = `                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                await manageTasks({
                    action: "updateStatus",
                    payload: { taskId, status: newStatus }`;
code = code.replace(c5, r5);

const c6 = `<<<<<<< HEAD
                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                await manageTasks({
                    action: "delete",
                    payload: { taskId }
                });
                fetchTasks();
=======
                await window.db.collection('tasks').doc(taskId).delete();
>>>>>>> origin/main`;
const r6 = `                const manageTasks = cloudFunctions.httpsCallable('manageTasks');
                await manageTasks({
                    action: "delete",
                    payload: { taskId }
                });
                fetchTasks();`;
code = code.replace(c6, r6);

const c7 = `<<<<<<< HEAD
            else if (action === 'updateTaskStatus') updateTaskStatus(id, status);
            else if (action === 'deleteTask') deleteTask(id);
=======
            else if (action === 'deleteCert') deleteCertification(id);
            else if (action === 'updateAssignedTaskStatus') updateAssignedTaskStatus(id, status);
            else if (action === 'deleteAssignedTask') deleteAssignedTask(id);
>>>>>>> origin/main`;
const r7 = `            else if (action === 'updateTaskStatus') updateTaskStatus(id, status);
            else if (action === 'deleteTask') deleteTask(id);
            else if (action === 'deleteCert') deleteCertification(id);
            else if (action === 'updateAssignedTaskStatus') updateAssignedTaskStatus(id, status);
            else if (action === 'deleteAssignedTask') deleteAssignedTask(id);`;
code = code.replace(c7, r7);

const c8 = `<<<<<<< HEAD
                if (action === 'updateTaskStatus') updateTaskStatus(id, status);
                if (action === 'deleteTask') deleteTask(id);
=======
                if (action === 'deleteCert') deleteCertification(id);
                if (action === 'updateAssignedTaskStatus') updateAssignedTaskStatus(id, status);
                if (action === 'deleteAssignedTask') deleteAssignedTask(id);
>>>>>>> origin/main`;
const r8 = `                if (action === 'updateTaskStatus') updateTaskStatus(id, status);
                if (action === 'deleteTask') deleteTask(id);
                if (action === 'deleteCert') deleteCertification(id);
                if (action === 'updateAssignedTaskStatus') updateAssignedTaskStatus(id, status);
                if (action === 'deleteAssignedTask') deleteAssignedTask(id);`;
code = code.replace(c8, r8);

fs.writeFileSync('index.html', code);
