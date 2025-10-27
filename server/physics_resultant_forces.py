from manim import *
import math
import numpy as np


config.pixel_height = 1080
config.pixel_width = 1920
config.frame_height = 8.0
config.frame_width = 14.222  # 16:9 aspect ratio


def deg_to_rad(angle_degrees):
    return angle_degrees * math.pi / 180


class AnalyticalMethod(Scene):
    def construct(self):
        title = Tex("Analytical Method: Resultant Forces").scale(1.2)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # --- Table of forces ---
        table_data = MathTable(
            [
                [r"F_1", r"0.7\,\text{N}", r"41^\circ\,\text{N of E}"],
                [r"F_2", r"2.0\,\text{N}", r"81^\circ\,\text{N of E}"],
                [r"F_3", r"1.8\,\text{N}", r"230^\circ\,\text{N of E}"],
            ],
            col_labels=[
                MathTex(r"\text{Force}"),
                MathTex(r"\text{Magnitude}"),
                MathTex(r"\text{Direction}")
            ],
            include_outer_lines=True
        )

        table_data.scale(0.7)
        table_data.to_edge(LEFT, buff=1.2)

        self.play(Create(table_data))
        self.wait(1)

        # --- Computation steps ---
        steps = [
            Tex(r"Resolve each force into components:").scale(0.75),
            MathTex(r"F_x = F\cos\theta,\quad F_y = F\sin\theta").scale(0.75),
            MathTex(r"R_x = \sum F_x,\quad R_y = \sum F_y").scale(0.75),
            MathTex(r"R = \sqrt{R_x^2 + R_y^2}").scale(0.75),
            MathTex(r"\tan\theta = \frac{R_y}{R_x}").scale(0.75),
        ]

        step_group = VGroup(*steps).arrange(DOWN, aligned_edge=LEFT, buff=0.35)
        step_group.next_to(table_data, RIGHT, buff=1.5)

        self.play(LaggedStart(*[Write(step) for step in steps], lag_ratio=0.5))
        self.wait(1)

        # --- Example calculation ---
        fx_sum = MathTex(
            r"R_x = (0.7\cos41^\circ) + (2.0\cos81^\circ) + (1.6\cos31^\circ)"
        ).scale(0.75)

        fy_sum = MathTex(
            r"R_y = (0.7\sin41^\circ) + (2.0\sin81^\circ) - (1.6\sin31^\circ)"
        ).scale(0.75)

        result_eq = MathTex(
            r"R = \sqrt{R_x^2 + R_y^2},\quad \theta = \tan^{-1}\!\left(\frac{R_y}{R_x}\right)"
        ).scale(0.75)

        eq_group = VGroup(fx_sum, fy_sum, result_eq).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        eq_group.next_to(step_group, DOWN, buff=0.6).shift(RIGHT * 0.5)

        self.play(Write(eq_group))
        self.wait(2)


class GraphicalMethodIllustration(Scene):
    def construct(self):
        title = Tex("Graphical Method: Vector Addition").scale(1.2)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        origin = ORIGIN

        # Define forces with directions and magnitudes
        forces = [
            {"mag": 0.7, "angle": 41, "color": RED},
            {"mag": 2.0, "angle": 81, "color": BLUE},
            {"mag": 1.6, "angle": -31, "color": GREEN},
        ]

        arrows = []
        current_point = origin
        for f in forces:
            angle_radians = deg_to_rad(f["angle"])
            vector = f["mag"] * np.array([math.cos(angle_radians), math.sin(angle_radians), 0])
            arrow = Arrow(start=current_point, end=current_point + vector, buff=0, color=f["color"])
            arrows.append(arrow)
            current_point = current_point + vector

        for arrow in arrows:
            self.play(GrowArrow(arrow))
            self.wait(0.5)

        resultant = Arrow(start=origin, end=current_point, buff=0, color=YELLOW)
        resultant_label = MathTex(r"\vec{R}").next_to(resultant.get_center(), UP)
        self.play(GrowArrow(resultant), Write(resultant_label))
        self.wait(2)

        self.play(FadeOut(VGroup(*arrows, resultant, resultant_label)))
        self.wait(0.5)


class Presentation(Scene):
    def construct(self):
        # --- Analytical Method ---
        analytical = AnalyticalMethod.construct
        analytical(self)
        self.wait(1)

        self.clear()
        # --- Graphical Method ---
        graphical = GraphicalMethodIllustration.construct
        graphical(self)
        self.wait(1)
        self.clear()