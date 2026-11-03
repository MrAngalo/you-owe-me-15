import { Component, computed, input } from '@angular/core';

export type IconName =
    | 'arrow-right'
    | 'calc'
    | 'camera'
    | 'close'
    | 'itemized'
    | 'link'
    | 'menu'
    | 'network'
    | 'payment'
    | 'percent'
    | 'tag';

@Component({
    selector: 'app-icon',
    template: '',
    styleUrl: './icon.component.scss',
    host: {
        'aria-hidden': 'true',
        '[style.--icon]': 'url()'
    }
})
export class IconComponent {
    readonly name = input.required<IconName>();
    protected readonly url = computed(
        () => `url(images/icons/icon-${this.name()}.svg)`
    );
}
