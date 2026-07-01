import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5173")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'Explorar o mapa primeiro' link to open the public radar/map.
        # Explorar o mapa primeiro link
        elem = page.get_by_text('Mapeie a condição dos picos de surf', exact=True).locator("xpath=ancestor-or-self::*[.//a][1]").get_by_role('link', name='Explorar o mapa primeiro', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click a spot marker on the map to open its detail/spot page (for example the 'Praião' marker visible on the map).
        # Map
        elem = page.get_by_role('region', name='Map', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the visible 'Ação Ecosurf' popup link (the event entry in the map popup) to open the spot/event detail page.
        # Ação Ecosurf 07:25 às 17:25 · Itanhaém/SP · 1... link
        elem = page.get_by_role('link', name='Ação Ecosurf 07:25 às 17:25 · Itanhaém/SP · 1 inscritos por João Malavolta ›', exact=True)
        await elem.click(timeout=10000)
        
        # -> Search the spot page for the label 'Condições' to locate the current conditions section (then scroll and search for the daily timeline label).
        await page.mouse.wheel(0, 300)
        
        # -> Scroll to the bottom of the spot detail page and search the page for the labels 'Condições' and 'Linha do tempo' to verify current conditions and the daily timeline are present.
        await page.mouse.wheel(0, 300)
        
        # --> Assertions to verify final state
        
        # --> Verify the spot page is displayed
        # Assert: Expected the spot content container to contain the "Condições" label to show current conditions.
        await expect(page.locator("xpath=/html/body/div/div/div/div/div[4]/div/div[1]").nth(0)).to_contain_text("Condi\u00e7\u00f5es", timeout=15000), "Expected the spot content container to contain the \"Condi\u00e7\u00f5es\" label to show current conditions."
        # Assert: Expected the spot content container to contain the "Linha do tempo" label to show the daily timeline.
        await expect(page.locator("xpath=/html/body/div/div/div/div/div[4]/div/div[1]").nth(0)).to_contain_text("Linha do tempo", timeout=15000), "Expected the spot content container to contain the \"Linha do tempo\" label to show the daily timeline."
        # Assert: Expected the URL to contain "/spot" to indicate the spot page is displayed.
        await expect(page).to_have_url(re.compile("/spot"), timeout=15000), "Expected the URL to contain \"/spot\" to indicate the spot page is displayed."
        
        # --> Verify current conditions and the daily timeline are displayed
        # Assert: Expected 'Condições' to be displayed on the spot page.
        await expect(page.locator("xpath=/html/body/div/div/div/div/div[4]/div/div[3]/div[1]").nth(0)).to_contain_text("Condi\u00e7\u00f5es", timeout=15000), "Expected 'Condi\u00e7\u00f5es' to be displayed on the spot page."
        # Assert: Expected 'Linha do tempo' to be displayed on the spot page.
        await expect(page.locator("xpath=/html/body/div/div/div/div/div[4]/div/div[3]/div[1]").nth(0)).to_contain_text("Linha do tempo", timeout=15000), "Expected 'Linha do tempo' to be displayed on the spot page."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    