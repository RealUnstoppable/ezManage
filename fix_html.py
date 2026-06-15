import re

with open('index.html', 'r') as f:
    content = f.read()

# Replace the malformed section
search_pattern = r"""                        <div>
                            <label class="block text-sm font-bold mb-1">Employee Name</label>
                            <select id="shiftEmpName" class="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500">
                                <option value="">Select Employee...</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold mb-1">Role</label>
                            <select id="shiftRole" class="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500">
                            <label for="shiftEmpName" class="block text-sm font-bold mb-1">Employee Name</label>
                            <input type="text" id="shiftEmpName" class="w-full" placeholder="John Doe">
                            <label class="block text-sm font-bold mb-1">Employee Name</label>
                            <select id="shiftEmpName" class="w-full">
                                <option value="" disabled selected>Select Employee</option>
                            </select>
                        </div>
                        <div>
                            <label for="shiftRole" class="block text-sm font-bold mb-1">Role</label>
                            <select id="shiftRole" class="w-full">"""

replace_pattern = r"""                        <div>
                            <label for="shiftEmpName" class="block text-sm font-bold mb-1">Employee Name</label>
                            <select id="shiftEmpName" class="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500">
                                <option value="" disabled selected>Select Employee...</option>
                            </select>
                        </div>
                        <div>
                            <label for="shiftRole" class="block text-sm font-bold mb-1">Role</label>
                            <select id="shiftRole" class="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-none focus:ring-2 focus:ring-sky-500">"""

if search_pattern in content:
    print("Found pattern!")
else:
    print("Pattern NOT found!")
