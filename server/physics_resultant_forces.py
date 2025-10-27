from manim import *
import math   # ← this line fixes the "math is not defined" error

# ============================================================
# Scene 1 — Analytical Method
# ============================================================
class AnalyticalMethod(Scene):
    def construct(self):
        title = Text("Data Results - Analytical Method", font_size=36, color=YELLOW).to_edge(UP)
        self.play(Write(title))

        # Left side table summary
        table_data = MathTable(
            [["F₁", "0.7 N", "41° N of E"],
             ["F₂", "2.0 N", "81° N of E"],
             ["F₃", "0.83 N", "25° N of W"]],
            include_outer_lines=True
        ).scale(0.7).to_edge(LEFT)

        self.play(Create(table_data))
        self.wait(1)

        # Resultant and calculations
        results = VGroup(
            MathTex("F_r = 2.83~\\text{N at}~88.20^\\circ~\\text{N of E}"),
            MathTex("W = 2.6705~\\text{N}"),
            MathTex("\\text{Percent error} = 5.97\\%")
        ).arrange(DOWN, aligned_edge=LEFT).scale(0.8).next_to(table_data, RIGHT, buff=1)

        self.play(Write(results[0]))
        self.wait(0.5)
        self.play(Write(results[1]))
        self.wait(0.5)
        self.play(Write(results[2]))
        self.wait(1.5)

        # Show process steps
        steps = [
            "1. Resolve each force into x and y components",
            "2. Sum up all x-components and y-components",
            "3. Use Pythagorean theorem: $F_r = \\sqrt{(\\Sigma F_x)^2 + (\\Sigma F_y)^2}$",
            "4. Direction: $\\theta = \\tan^{-1}(\\Sigma F_y / \\Sigma F_x)$",
            "5. Compute percent error vs theoretical weight"
        ]
        step_texts = VGroup(*[Text(s, font_size=22) for s in steps]).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        step_texts.to_edge(DOWN)

        for t in step_texts:
            self.play(FadeIn(t, shift=UP), run_time=0.5)
            self.wait(0.3)

        self.wait(2)
        self.play(FadeOut(VGroup(title, table_data, results, step_texts)))


# ============================================================
# Scene 2 — Graphical Method Illustration
# ============================================================
class GraphicalMethodIllustration(Scene):
    def construct(self):
        title = Text("Data Results - Graphical Method (Illustration)", font_size=36, color=YELLOW).to_edge(UP)
        self.play(Write(title))

        origin = Dot(ORIGIN)
        self.play(FadeIn(origin))

        # Force vectors — approximate visualization
        f1 = Arrow(ORIGIN, 0.7*RIGHT + 0.7*UP*math.tan(math.radians(41)), buff=0, color=BLUE)
        f2_start = f1.get_end()
        f2 = Arrow(f2_start, f2_start + 2*RIGHT + 2*UP*math.tan(math.radians(81)), buff=0, color=GREEN)
        f3_start = f2.get_end()
        f3 = Arrow(f3_start, f3_start + 0.83*LEFT + 0.83*UP*math.tan(math.radians(25)), buff=0, color=RED)

        resultant = DashedLine(ORIGIN, f3.get_end(), color=YELLOW)

        labels = [
            MathTex("F_1").next_to(f1, UP),
            MathTex("F_2").next_to(f2, RIGHT),
            MathTex("F_3").next_to(f3, LEFT),
            MathTex("F_r").next_to(resultant, UP)
        ]

        # Animate vectors head-to-tail
        self.play(GrowArrow(f1))
        self.play(GrowArrow(f2))
        self.play(GrowArrow(f3))
        self.play(Create(resultant))
        self.play(*[Write(l) for l in labels])
        self.wait(2)

        explanation = Tex(
            "Head-to-tail method: the resultant connects the tail of the first vector ",
            "to the head of the last vector.",
            font_size=26
        ).next_to(resultant, DOWN)
        self.play(Write(explanation))
        self.wait(3)
        self.play(FadeOut(VGroup(title, f1, f2, f3, resultant, *labels, explanation)))


# ============================================================
# Scene 3 — Graphical Method (Results)
# ============================================================
class GraphicalMethodResults(Scene):
    def construct(self):
        title = Text("Data Results - Graphical Method", font_size=36, color=YELLOW).to_edge(UP)
        self.play(Write(title))

        table = MathTable(
            [["F_r (measured)", "2.8 N at 88° N of E"],
             ["W (theoretical)", "2.6705 N"],
             ["Percent error", "4.85%"]],
            include_outer_lines=True
        ).scale(0.8).to_edge(LEFT)

        self.play(Create(table))
        self.wait(1)

        steps = [
            "1. Scale: 1 N = 10 cm",
            "2. Draw each force vector at proper angles",
            "3. Measure resultant vector’s length and direction",
            "4. Compute percent error"
        ]
        process = VGroup(*[Text(s, font_size=22) for s in steps]).arrange(DOWN, aligned_edge=LEFT, buff=0.25)
        process.to_edge(RIGHT)
        self.play(FadeIn(process, shift=LEFT))

        compare = Tex(
            "Graphical method gave a slightly lower percent error than Analytical method.",
            font_size=26,
            color=YELLOW
        ).next_to(table, DOWN, buff=0.5)
        self.play(Write(compare))
        self.wait(3)
        self.play(FadeOut(VGroup(title, table, process, compare)))


# ============================================================
# Combine all three
# ============================================================
class Presentation(Scene):
    def construct(self):
        for scene in [AnalyticalMethod(), GraphicalMethodIllustration(), GraphicalMethodResults()]:
            scene.construct()
