import { loadFooter } from '../js/footer.js';

describe('loadFooter', () => {
    beforeEach(() => {

        document.body.innerHTML = `
            <div class="main-footer"></div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should inject footer HTML into the main-footer element', () => {
        loadFooter();

        const footer = document.querySelector('.main-footer');
        expect(footer).not.toBeNull();
        expect(footer.innerHTML).toContain('class="footer-container"');
        expect(footer.innerHTML).toContain('Navigate');
        expect(footer.innerHTML).toContain('Connect');
        expect(footer.innerHTML).toContain('Company');
        expect(footer.innerHTML).toContain('Stay in the Loop');
        expect(footer.innerHTML).toContain('Sign Up');
        expect(footer.innerHTML).toContain('2026 Unstoppable LLC');
        expect(footer.innerHTML).toContain('Designed in collaboration with Unstoppable Design, LLC');
    });

    it('should not throw if main-footer element does not exist', () => {
        document.body.innerHTML = '<div>No footer here</div>';

        expect(() => loadFooter()).not.toThrow();

        expect(document.querySelector('.main-footer')).toBeNull();
    });
});
